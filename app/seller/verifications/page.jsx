'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';
import { VerificationBadge } from '@/components/VerificationStatus';
export default function VerificationsPage() {
    const { getToken, user } = useAppContext();
    const [status, setStatus] = useState('PENDING');
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [detail, setDetail] = useState(null);
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const busy = useRef(false);
    const headers = async () => ({ Authorization: 'Bearer ' + await getToken() });
    const load = async () => {
        setLoading(true);
        try { const { data } = await axios.get('/api/verification/list', { params: { status, page }, headers: await headers() }); setRows(data.verifications); setTotal(data.total); setError(''); }
        catch (err) { setError(err.response?.data?.message || 'Unable to load verifications'); }
        finally { setLoading(false); }
    };
    useEffect(() => { if (user) load(); }, [user, status, page]);
    const open = async id => {
        try { const { data } = await axios.get('/api/verification/detail/' + id, { headers: await headers() }); setDetail(data.verification); }
        catch (err) { toast.error(err.response?.data?.message || 'Unable to load review'); }
    };
    const review = async () => {
        if (busy.current) return;
        if (action === 'reject' && !reason.trim()) return toast.error('Rejection Reason is required');
        busy.current = true; setSaving(true);
        try {
            const { data } = await axios.patch('/api/verification/review/' + detail._id, { action, rejectionReason: reason }, { headers: await headers() });
            setDetail(current => ({ ...current, ...data.verification })); setAction(null); setReason(''); await load();
            toast.success(action === 'approve' ? 'Your identity verification has been approved.' : 'Your identity verification requires an update.');
        } catch (err) { toast.error(err.response?.data?.message || 'Unable to review verification'); }
        finally { busy.current = false; setSaving(false); }
    };
    return <div className="p-4 md:p-8 text-gray-700 w-full"><h1 className="text-2xl font-medium mb-6">Verifications</h1>
        <div className="flex flex-wrap gap-2 mb-5">{['All','PENDING','VERIFIED','REJECTED'].map(value => <button key={value} onClick={() => { setStatus(value); setPage(1); }} className={'border rounded px-4 py-2 ' + (status === value ? 'bg-green-600 text-white' : '')}>{value === 'All' ? value : value[0]+value.slice(1).toLowerCase()}</button>)}</div>
        {loading ? <div className="h-40 bg-gray-100 animate-pulse rounded" /> : error ? <div role="alert">{error}<button onClick={load} className="ml-3 underline">Retry</button></div> : !rows.length ? <p>No verifications found.</p> : <div className="overflow-x-auto"><table className="w-full text-sm border"><thead className="bg-gray-50"><tr>{['User','Document Type','Submitted At','Status','Reviewed At','Actions'].map(label => <th key={label} className="text-left p-3">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row._id} className="border-t"><td className="p-3">{row.userId?.name || 'User'}</td><td className="p-3">{row.documentType}</td><td className="p-3">{new Date(row.submittedAt).toLocaleDateString()}</td><td className="p-3"><VerificationBadge status={row.status} /></td><td className="p-3">{row.reviewedAt ? new Date(row.reviewedAt).toLocaleDateString() : '—'}</td><td className="p-3"><button onClick={() => open(row._id)} className="text-green-700 underline">Review</button></td></tr>)}</tbody></table></div>}
        <div className="flex gap-3 mt-4"><button disabled={page === 1} onClick={() => setPage(page-1)} className="border rounded p-2 disabled:opacity-50">Previous</button><span className="py-2">Page {page}</span><button disabled={page*50 >= total} onClick={() => setPage(page+1)} className="border rounded p-2 disabled:opacity-50">Next</button></div>
        {detail && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="Verification review" className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between"><h2 className="text-xl font-medium">Verification Review</h2><button disabled={saving} onClick={() => { setDetail(null); setAction(null); }} className="border rounded px-3 py-2">Close</button></div>
            <h3 className="font-medium mt-4">USER</h3><p>{detail.user?.name} · {detail.user?.email}</p><p>{detail.phone}</p>
            <h3 className="font-medium mt-4">IDENTITY · {detail.documentType}</h3><div className="grid sm:grid-cols-2 gap-4 mt-3">{['document','selfie'].map(kind => <div key={kind}><p>{kind === 'document' ? 'Identity Document' : 'Selfie'}</p><img alt={kind === 'document' ? 'Identity document' : 'Selfie'} src={'/api/verification/image/' + detail._id + '/' + kind} className="w-full max-h-72 object-contain rounded border mt-2" onError={event => { event.currentTarget.alt = 'Image unavailable or no longer retained'; }} /></div>)}</div>
            <h3 className="font-medium mt-4">BILLING</h3><p>{detail.fullName} · {detail.phone}</p><p>{detail.billingAddress}</p>
            <h3 className="font-medium mt-4">EMERGENCY CONTACT</h3><p>{detail.emergencyContact?.name} · {detail.emergencyContact?.relationship} · {detail.emergencyContact?.phone}</p>
            <h3 className="font-medium mt-4">SUBMISSION</h3><p>Submitted: {new Date(detail.submittedAt).toLocaleString()}</p><VerificationBadge status={detail.status} />
            {detail.rejectionReason && <p className="text-red-600 mt-2">{detail.rejectionReason}</p>}
            {detail.status === 'PENDING' && !action && <div className="flex flex-wrap gap-3 mt-5"><button onClick={() => setAction('approve')} className="bg-green-600 text-white rounded px-4 py-3">Approve Verification</button><button onClick={() => setAction('reject')} className="bg-red-600 text-white rounded px-4 py-3">Reject Verification</button></div>}
            {action && <div className="border rounded p-4 mt-5"><h3 className="font-medium">{action === 'approve' ? 'Confirm approval?' : 'Reject Verification'}</h3>{action === 'reject' && <label className="block mt-3">Rejection Reason<textarea maxLength={1000} required value={reason} onChange={event => setReason(event.target.value)} className="w-full border rounded p-3 mt-1" /></label>}<div className="flex gap-3 mt-4"><button disabled={saving} onClick={() => setAction(null)} className="border rounded px-4 py-2">Cancel</button><button disabled={saving} onClick={review} className="bg-green-600 text-white rounded px-4 py-2 disabled:opacity-50">{saving ? 'Saving...' : 'Confirm'}</button></div></div>}
        </div></div>}
    </div>;
}

