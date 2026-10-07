'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
export const statusLabels = { NOT_SUBMITTED: 'Not Verified', PENDING: 'Pending', VERIFIED: 'Verified', REJECTED: 'Rejected' };
export function VerificationBadge({ status }) {
    return <span className={'text-xs px-2 py-1 rounded-full ' + (status === 'VERIFIED' ? 'bg-green-100 text-green-700' : status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800')}>{statusLabels[status] || 'Not Verified'}</span>;
}
export function useVerification() {
    const { user, getToken, isAuthLoaded } = useAppContext();
    const [verification, setVerification] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!user) { if (active) { setVerification(null); setLoading(false); } return; }
            setLoading(true);
            try {
                const token = await getToken();
                const { data } = await axios.get('/api/verification/data', { headers: { Authorization: 'Bearer ' + token } });
                if (active) { setVerification(data.verification); setError(''); }
            } catch (err) { if (active) { setVerification(null); setError(err.response?.data?.message || 'Unable to load verification'); } }
            finally { if (active) setLoading(false); }
        };
        if (isAuthLoaded) load();
        const refresh = () => load();
        window.addEventListener('focus', refresh);
        return () => { active = false; window.removeEventListener('focus', refresh); };
    }, [user, getToken, isAuthLoaded]);
    return { verification, setVerification, loading, error };
}
export default function VerificationStatus({ state }) {
    const { verification: v, loading, error } = state;
    return <section className="border rounded p-4 my-4 text-sm">
        <h3 className="font-medium mb-2">Rental Verification</h3>
        {loading ? <div className="h-12 bg-gray-200 animate-pulse rounded" /> : error ? <p role="alert" className="text-red-600">{error}</p> : v?.status === 'VERIFIED' ? <>
            <p className="text-green-700">✓ Identity Verified</p><p>Verified with: {v.documentType}</p><p>Verified on: {new Date(v.verifiedAt).toLocaleDateString()}</p>
            <p className="text-gray-600 mt-2">Your identity has already been verified. No additional upload is required.</p>
        </> : <>
            <p className="font-medium">{v?.status === 'PENDING' ? 'Verification Pending' : 'Verification Required'}</p>
            <p className="text-gray-600 my-2">{v?.status === 'PENDING' ? 'Your verification is currently being reviewed.' : 'Verify your identity before completing your rental.'}</p>
            {v?.status === 'REJECTED' && <p className="text-red-600 mb-2">{v.rejectionReason}</p>}
            <Link className="text-green-700 underline" href="/account/verification">{v?.status === 'REJECTED' ? 'Update Verification' : v?.status === 'PENDING' ? 'View Verification' : 'Verify Identity'}</Link>
        </>}
    </section>;
}

