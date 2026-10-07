'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAppContext } from '@/context/AppContext';
import { useClerk } from '@clerk/nextjs';
import { useVerification, VerificationBadge } from '@/components/VerificationStatus';
import { validateImageFiles } from '@/lib/uploads.mjs';

const initial = { documentType: 'KTP', fullName: '', phone: '', billingAddress: '', emergencyContact: { name: '', relationship: '', phone: '' }, consent: false };
const steps = ['Identity Document', 'Selfie Verification', 'Contact Information', 'Emergency Contact', 'Review'];
export default function VerificationPage() {
    const { user, getToken, isAuthLoaded } = useAppContext();
    const { openSignIn } = useClerk();
    const [editing, setEditing] = useState(false);
    const { verification: v, setVerification, loading, error } = useVerification({ refreshOnFocus: !editing });
    const [step, setStep] = useState(0);
    const [data, setData] = useState(initial);
    const [files, setFiles] = useState({});
    const [previews, setPreviews] = useState({});
    const [imageStatus, setImageStatus] = useState({});
    const [imageErrors, setImageErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [saving, setSaving] = useState(false);
    const [progress, setProgress] = useState(0);
    const busy = useRef(false);
    const previewUrls = useRef([]);
    useEffect(() => () => previewUrls.current.forEach(URL.revokeObjectURL), []);
    const start = () => {
        setData({ ...initial, fullName: v?.fullName || user?.fullName || '', phone: v?.phone || '', billingAddress: v?.billingAddress || '', emergencyContact: v?.emergencyContact || initial.emergencyContact });
        setFiles({}); setPreviews({}); setImageStatus({}); setImageErrors({}); setSubmitError(''); setStep(0); setEditing(true);
    };
    const choose = (key, file) => {
        if (busy.current || !file) return;
        const validation = validateImageFiles([file], { maxCount: 1 });
        if (validation) {
            const message = file.size > 5 * 1024 * 1024 ? 'Image is too large. Maximum size is 5 MB.' : validation.includes('Only') ? 'Unsupported image format. Use JPEG, PNG or WebP.' : validation;
            setImageErrors(current => ({ ...current, [key]: message }));
            toast.error(message);
            return;
        }
        setFiles(current => ({ ...current, [key]: file }));
        const url = URL.createObjectURL(file);
        previewUrls.current.push(url);
        setPreviews(current => ({ ...current, [key]: url }));
        setImageStatus(current => ({ ...current, [key]: 'selected' }));
        setImageErrors(current => ({ ...current, [key]: '' }));
        setSubmitError('');
    };
    const validStep = () => {
        if (step === 0 && !files.documentImage) return 'Upload Identity Document';
        if (step === 1 && !files.selfieImage) return 'Upload Selfie';
        if (step === 2 && (!data.fullName.trim() || !data.phone.trim() || !data.billingAddress.trim())) return 'Complete contact information';
        if (step === 3 && Object.values(data.emergencyContact).some(value => !value.trim())) return 'Complete emergency contact';
        return null;
    };
    const submit = async () => {
        if (busy.current) return;
        if (!files.documentImage || !files.selfieImage) return toast.error('Identity document and selfie are required');
        if (!data.consent) return toast.error('Consent is required');
        busy.current = true; setSaving(true); setProgress(0); setSubmitError('');
        setImageStatus({ documentImage: 'uploading', selfieImage: 'uploading' });
        try {
            const form = new FormData();
            form.append('data', JSON.stringify(data));
            form.append('documentImage', files.documentImage); form.append('selfieImage', files.selfieImage);
            const token = await getToken();
            const response = await axios({ method: v?.status === 'REJECTED' ? 'put' : 'post', url: '/api/verification/submit', data: form,
                headers: { Authorization: 'Bearer ' + token }, onUploadProgress: event => setProgress(Math.round(event.loaded * 100 / (event.total || event.loaded))) });
            if (!response.data?.success || response.data.verification?.status !== 'PENDING') throw new Error('Invalid verification response');
            setImageStatus({ documentImage: 'success', selfieImage: 'success' });
            setVerification(response.data.verification); setEditing(false);
            toast.success('Verification submitted successfully.');
        } catch (err) {
            const message = err.response?.data?.message || 'Upload failed. Check your connection and retry.';
            setImageStatus({ documentImage: 'error', selfieImage: 'error' });
            setSubmitError(message);
            toast.error(message);
        }
        finally { busy.current = false; setSaving(false); }
    };
    const input = (label, key, emergency = false) => <label className="block mb-4">{label}<input required maxLength={key === 'phone' ? 30 : 150} type={key === 'phone' ? 'tel' : 'text'} value={emergency ? data.emergencyContact[key] : data[key]} onChange={event => setData(current => emergency ? { ...current, emergencyContact: { ...current.emergencyContact, [key]: event.target.value } } : { ...current, [key]: event.target.value })} className="mt-1 border rounded p-3 w-full" /></label>;
    const upload = (key, label) => <div><label className="block border-2 border-dashed rounded p-5 cursor-pointer">{files[key] ? 'Replace Image' : label}<input disabled={saving} className="block mt-3 w-full" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
        const file = event.currentTarget.files?.[0];
        choose(key, file);
        // The captured File lives in form state, so reselecting the same file is safe.
        event.currentTarget.value = '';
    }} /><span className="text-xs text-gray-500">JPEG, PNG or WebP · Maximum 5 MB</span></label>{previews[key] && <img src={previews[key]} className="mt-4 max-h-48 max-w-full rounded object-contain" alt={label + ' preview'} />}{files[key] && <p role="status" className="text-sm text-green-700 mt-2">{imageStatus[key] === 'uploading' ? 'Uploading...' : imageStatus[key] === 'success' ? '✓ Image uploaded' : '✓ Image selected — ready to submit'}</p>}{imageErrors[key] && <p role="alert" className="text-red-600 text-sm mt-2">{imageErrors[key]}</p>}</div>;
    return <><Navbar /><main className="max-w-3xl mx-auto px-6 py-10 text-gray-700">
        {!isAuthLoaded || (loading && !editing) ? <div className="h-48 bg-gray-100 rounded animate-pulse" /> : !user ? <><h1 className="text-2xl">Verify Your Identity</h1><button onClick={() => openSignIn()} className="bg-green-600 text-white px-5 py-3 rounded mt-4">Sign in</button></> : error && !editing ? <p role="alert">{error}</p> : editing ? <div className="border rounded-lg p-6">
            <p className="text-sm text-gray-500">Step {step+1} of 5</p><h1 className="text-2xl font-medium my-3">{steps[step]}</h1>
            {step === 0 && <><fieldset className="flex gap-6 mb-5"><legend className="mb-2">Document Type</legend>{['KTP','SIM'].map(type => <label key={type}><input type="radio" checked={data.documentType === type} onChange={() => setData(current => ({ ...current, documentType: type }))} /> {type}</label>)}</fieldset>{upload('documentImage','Upload Identity Document')}</>}
            {step === 1 && <><p className="mb-4">Take a clear selfie while holding the same identity document.</p>{upload('selfieImage','Upload Selfie')}</>}
            {step === 2 && <>{input('Full Name','fullName')}{input('Phone Number','phone')}<label>Billing / Domicile Address<textarea maxLength={1000} className="border rounded p-3 w-full mt-1" value={data.billingAddress} onChange={event => setData(current => ({ ...current, billingAddress: event.target.value }))} /></label></>}
            {step === 3 && <>{input('Full Name','name',true)}{input('Relationship','relationship',true)}{input('Phone Number','phone',true)}</>}
            {step === 4 && <><div className="grid sm:grid-cols-2 gap-4">{Object.entries(previews).map(([key,url]) => <img key={key} src={url} alt={key === 'documentImage' ? 'Identity document preview' : 'Selfie preview'} className="max-h-40 max-w-full object-contain" />)}</div><p className="mt-4">{data.documentType} · {data.fullName} · {data.phone}</p><p>{data.billingAddress}</p><p className="my-4">Emergency: {data.emergencyContact.name} · {data.emergencyContact.relationship} · {data.emergencyContact.phone}</p><label className="flex gap-2"><input type="checkbox" checked={data.consent} onChange={event => setData(current => ({ ...current, consent: event.target.checked }))} />I confirm that the information provided is accurate and belongs to me.</label></>}
            {saving && <p role="status" className="mt-4">Uploading {progress}% · Processing securely...</p>}
            {submitError && <div role="alert" className="text-red-600 mt-4"><p>{submitError}</p><button disabled={saving} onClick={submit} className="underline mt-2">Retry Upload</button></div>}
            <div className="flex justify-between gap-3 mt-6"><button disabled={saving} onClick={() => step ? setStep(step-1) : setEditing(false)} className="border rounded px-4 py-3">Back</button><button disabled={saving} onClick={() => { if (step === 4) submit(); else { const problem = validStep(); if (problem) toast.error(problem); else setStep(step+1); } }} className="bg-green-600 text-white rounded px-4 py-3 disabled:opacity-50">{step === 4 ? 'Submit Verification' : 'Continue'}</button></div>
        </div> : <div className="border rounded-lg p-6">
            <VerificationBadge status={v?.status} /><h1 className="text-2xl font-medium mt-4">{v?.status === 'VERIFIED' ? 'Identity Verified' : v?.status === 'PENDING' ? 'Verification Pending' : v?.status === 'REJECTED' ? 'Verification Needs Attention' : 'Verify Your Identity'}</h1>
            {v?.status === 'VERIFIED' ? <><p className="my-4">✓ Verified · Document: {v.documentType}</p><p>Verified on: {new Date(v.verifiedAt).toLocaleDateString()}</p><p className="mt-3">Your identity is verified and can be used for future rentals.</p></> : v?.status === 'PENDING' ? <><p className="my-4">Your information has been submitted and is waiting for review.</p><p>Submitted: {new Date(v.submittedAt).toLocaleDateString()} · {v.documentType}</p><p className="mt-2">Contact: {v.fullName}</p></> : <><p className="my-4">{v?.status === 'REJECTED' ? v.rejectionReason : 'Complete identity verification once to rent equipment securely.'}</p><div className="space-y-3"><p>Identity Document — KTP or SIM</p><p>Selfie Verification — Selfie while holding your selected ID</p><p>Contact Information — Billing and emergency contact</p></div><button onClick={start} className="bg-green-600 text-white rounded px-5 py-3 mt-6">{v?.status === 'REJECTED' ? 'Update Verification' : 'Start Verification'}</button></>}
        </div>}
    </main><Footer /></>;
}
