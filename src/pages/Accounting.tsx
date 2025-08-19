import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Accounting() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the Bills Approval Status page
    navigate('/accounting/bills/approval-status', { replace: true });
  }, [navigate]);

  return null;
}