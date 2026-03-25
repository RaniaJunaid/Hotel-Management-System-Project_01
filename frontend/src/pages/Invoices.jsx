import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

export default function Invoices() {
  const [invoices, setInvoices]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showPayModal, setShowPayModal]   = useState(false);
  const [showReceipt, setShowReceipt]     = useState(false);
  const [selectedInv, setSelectedInv]     = useState(null);
  const [receiptData, setReceiptData]     = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [paying, setPaying]           = useState(false);
  const [message, setMessage]         = useState({ type: '', text: '' });
  const receiptRef = useRef();

  const [payForm, setPayForm] = useState({
    amount: '', payment_method: 'credit_card',
    transaction_id: '', notes: ''
  });
  const [payErrors, setPayErrors] = useState({});

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
  setLoading(true);
  try {
    const res = await api.get('/invoices/overdue');
    console.log('Invoices received:', res.data.data.length);
    console.log('Invoice data:', res.data.data);
    setInvoices(res.data.data);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};


  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const openPayModal = async (inv) => {
  // First get remaining balance
  try {
    const res = await api.get(`/invoices/${inv.invoice_id}/receipt`);
    const receipt   = res.data.data;
    const totalPaid = receipt.payments.reduce(
      (sum, p) => sum + parseFloat(p.amount), 0
    );
    const remaining = (parseFloat(inv.total_amount) - totalPaid).toFixed(2);

    setSelectedInv(inv);
    setPayForm({
      amount:         remaining,
      payment_method: 'credit_card',
      transaction_id: `TXN-${Date.now()}`,
      notes:          ''
    });
    setPayErrors({});
    setShowPayModal(true);
  } catch (err) {
    // Fallback to full amount if receipt fails
    setSelectedInv(inv);
    setPayForm({
      amount:         inv.total_amount,
      payment_method: 'credit_card',
      transaction_id: `TXN-${Date.now()}`,
      notes:          ''
    });
    setPayErrors({});
    setShowPayModal(true);
  }
};

  const openReceipt = async (inv) => {
    setReceiptLoading(true);
    setShowReceipt(true);
    try {
      const res = await api.get(`/invoices/${inv.invoice_id}/receipt`);
      setReceiptData(res.data.data);
    } catch (err) {
      showMsg('error', 'Failed to load receipt.');
      setShowReceipt(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  const validatePay = () => {
    const errors = {};
    if (!payForm.amount || payForm.amount <= 0) errors.amount = 'Valid amount required';
    if (!payForm.payment_method) errors.payment_method = 'Payment method required';
    return errors;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const errors = validatePay();
    if (Object.keys(errors).length > 0) { setPayErrors(errors); return; }

    setPaying(true);
    try {
      await api.post(`/invoices/${selectedInv.invoice_id}/payments`, {
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        transaction_id: payForm.transaction_id,
        notes: payForm.notes
      });
      showMsg('success', `✅ Payment of $${payForm.amount} recorded for ${selectedInv.invoice_number}`);
      setShowPayModal(false);
      fetchInvoices();
    } catch (err) {
      showMsg('error', `❌ ${err.response?.data?.message || 'Payment failed'}`);
    } finally {
      setPaying(false);
    }
  };

  const handlePrint = () => {
    const content = receiptRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 20px; max-width: 600px; margin: 0 auto; }
        h2 { text-align: center; } hr { border: 1px dashed #ccc; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 6px 8px; text-align: left; font-size: 13px; }
        .right { text-align: right; }
        .total { font-weight: bold; font-size: 15px; }
      </style></head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const statusBadge = (status) => {
    const map = {
      paid: 'badge-success', unpaid: 'badge-danger',
      partial: 'badge-warning', refunded: 'badge-info'
    };
    return <span className={`badge ${map[status] || 'badge-secondary'}`}>{status}</span>;
  };

  const nights = (inv) => {
    if (!inv) return 0;
    const ci = new Date(inv.check_in_date);
    const co = new Date(inv.check_out_date);
    return Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
  };

  const loyaltyDiscount = (points) => {
    if (points >= 1000) return { tier: 'Platinum', discount: 0.10 };
    if (points >= 500)  return { tier: 'Gold',     discount: 0.07 };
    if (points >= 100)  return { tier: 'Silver',   discount: 0.05 };
    return { tier: 'Bronze', discount: 0 };
  };

  if (loading) return <div className="loading"><div className="spinner" />Loading invoices...</div>;

  const inv = receiptData?.invoice;
  const loyalty = inv ? loyaltyDiscount(parseInt(inv.loyalty_points)) : null;
  const loyaltyDiscountAmt = inv ? parseFloat((inv.subtotal * (loyalty?.discount || 0)).toFixed(2)) : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Overdue Invoices</h1>
        <p>Invoices requiring immediate payment attention</p>
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Guest</th>
              <th>Branch</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Days Overdue</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div className="icon">✅</div>
                  No overdue invoices — all caught up!
                </div>
              </td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.invoice_id}>
                <td><strong>{inv.invoice_number}</strong></td>
                <td>
                  <strong>{inv.first_name} {inv.last_name}</strong><br />
                  <small style={{ color: '#999' }}>{inv.email}</small>
                </td>
                <td>{inv.branch_name}</td>
                <td><strong>${inv.total_amount}</strong></td>
                <td>{inv.due_date?.split('T')[0]}</td>
                <td><span className="badge badge-danger">{inv.days_overdue} days</span></td>
                <td>{statusBadge(inv.payment_status)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => openReceipt(inv)}>
                      🧾 Receipt
                    </button>
                    <button className="btn btn-success btn-sm" onClick={() => openPayModal(inv)}>
                      💳 Pay
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAYMENT MODAL */}
      {showPayModal && selectedInv && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💳 Record Payment</h2>
              <button className="modal-close" onClick={() => setShowPayModal(false)}>✕</button>
            </div>

            <div style={{
  background: '#f8f6f0', borderRadius: 12, padding: 16,
  marginBottom: 20, fontSize: '0.9rem'
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span>Invoice:</span>
    <strong>{selectedInv.invoice_number}</strong>
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
    <span>Guest:</span>
    <strong>{selectedInv.first_name} {selectedInv.last_name}</strong>
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
    <span>Invoice Total:</span>
    <span>${selectedInv.total_amount}</span>
  </div>
  <div style={{
    display: 'flex', justifyContent: 'space-between',
    marginTop: 6, paddingTop: 6,
    borderTop: '1px dashed #e5e0d5'
  }}>
    <span>Remaining Due:</span>
    <strong style={{ color: '#e74c3c', fontSize: '1.1rem' }}>
      ${payForm.amount}
    </strong>
  </div>
</div>

            <form onSubmit={handlePayment}>
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number" step="0.01"
                  className={`form-control ${payErrors.amount ? 'error' : ''}`}
                  value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                />
                {payErrors.amount && <p className="error-msg">{payErrors.amount}</p>}
              </div>

              <div className="form-group">
                <label>Payment Method *</label>
                <select
                  className="form-control"
                  value={payForm.payment_method}
                  onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}
                >
                  <option value="credit_card">💳 Credit Card</option>
                  <option value="debit_card">💳 Debit Card</option>
                  <option value="cash">💵 Cash</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="online">🌐 Online</option>
                </select>
              </div>

              <div className="form-group">
                <label>Transaction ID</label>
                <input
                  className="form-control"
                  value={payForm.transaction_id}
                  onChange={e => setPayForm({ ...payForm, transaction_id: e.target.value })}
                  placeholder="Auto-generated"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <input
                  className="form-control"
                  value={payForm.notes}
                  onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="Optional notes..."
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ background: '#f0ebe0' }}
                  onClick={() => setShowPayModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={paying}>
                  {paying ? '⏳ Processing...' : '✅ Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceipt && (
        <div className="modal-overlay" onClick={() => setShowReceipt(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🧾 Invoice Receipt</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ Print</button>
                <button className="modal-close" onClick={() => setShowReceipt(false)}>✕</button>
              </div>
            </div>

            {receiptLoading ? (
              <div className="loading"><div className="spinner" />Loading receipt...</div>
            ) : receiptData && (
              <div ref={receiptRef}>
                {/* Hotel Header */}
                <div style={{
                  textAlign: 'center', padding: '20px 0',
                  borderBottom: '2px dashed #e5e0d5', marginBottom: 20
                }}>
                  <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#1a1a2e', fontSize: '1.8rem' }}>
                    Grand Plaza Hotels
                  </h2>
                  <p style={{ color: '#999', fontSize: '0.85rem' }}>
                    {inv.branch_name} — {inv.city} | {inv.branch_phone}
                  </p>
                  <p style={{ color: '#999', fontSize: '0.85rem' }}>
                    Invoice: <strong style={{ color: '#1a1a2e' }}>{inv.invoice_number}</strong>
                  </p>
                </div>

                {/* Guest & Stay Info */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: 16, marginBottom: 20
                }}>
                  <div style={{ background: '#f8f6f0', borderRadius: 10, padding: 16 }}>
                    <p style={{ fontSize: '0.75rem', color: '#999', textTransform: 'uppercase',
                      letterSpacing: 1, marginBottom: 8 }}>Guest Details</p>
                    <p style={{ fontWeight: 600 }}>{inv.first_name} {inv.last_name}</p>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>{inv.email}</p>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>{inv.phone}</p>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>{inv.nationality}</p>
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        background: loyalty?.tier === 'Platinum' ? '#e8d5b7' :
                                    loyalty?.tier === 'Gold'     ? '#fff3cd' :
                                    loyalty?.tier === 'Silver'   ? '#e2e3e5' : '#d4edda',
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: '0.75rem', fontWeight: 600
                      }}>
                        ⭐ {loyalty?.tier} — {inv.loyalty_points} pts
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#f8f6f0', borderRadius: 10, padding: 16 }}>
                    <p style={{ fontSize: '0.75rem', color: '#999', textTransform: 'uppercase',
                      letterSpacing: 1, marginBottom: 8 }}>Stay Details</p>
                    <p style={{ fontWeight: 600 }}>Room {inv.room_number} — {inv.type_name}</p>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>
                      Check-in: {inv.check_in_date?.split('T')[0]}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>
                      Check-out: {inv.check_out_date?.split('T')[0]}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>
                      Duration: {nights(inv)} nights
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>
                      Guests: {inv.num_adults} adults, {inv.num_children} children
                    </p>
                  </div>
                </div>

                {/* Room Charges */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
                  <thead>
                    <tr style={{ background: '#1a1a2e', color: 'white' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.8rem' }}>Description</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.8rem' }}>Qty</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.8rem' }}>Unit Price</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.8rem' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Room row */}
                    <tr style={{ borderBottom: '1px solid #e5e0d5' }}>
                      <td style={{ padding: '10px 12px', fontSize: '0.9rem' }}>
                        <strong>Room {inv.room_number}</strong> — {inv.type_name}
                        <br /><small style={{ color: '#999' }}>Accommodation ({nights(inv)} nights)</small>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.9rem' }}>
                        {nights(inv)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.9rem' }}>
                        ${inv.base_price}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.9rem' }}>
                        ${(parseFloat(inv.base_price) * nights(inv)).toFixed(2)}
                      </td>
                    </tr>

                    {/* Services */}
                    {receiptData.services.map((svc, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e5e0d5' }}>
                        <td style={{ padding: '10px 12px', fontSize: '0.9rem' }}>
                          <strong>{svc.service_name}</strong>
                          <br /><small style={{ color: '#999' }}>{svc.category} — {svc.notes}</small>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.9rem' }}>
                          {svc.quantity}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.9rem' }}>
                          ${svc.unit_price}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.9rem' }}>
                          ${svc.total_price}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{
                  background: '#f8f6f0', borderRadius: 10,
                  padding: 16, marginTop: 8, marginBottom: 20
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>Subtotal</span>
                    <span>${inv.subtotal}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#666' }}>Tax (10%)</span>
                    <span>${inv.tax_amount}</span>
                  </div>
                  {inv.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#666' }}>Discount</span>
                      <span style={{ color: '#27ae60' }}>-${inv.discount_amount}</span>
                    </div>
                  )}
                  {loyalty?.discount > 0 && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      marginBottom: 8, color: '#c9a84c'
                    }}>
                      <span>⭐ {loyalty.tier} Loyalty Discount ({loyalty.discount * 100}%)</span>
                      <span>-${loyaltyDiscountAmt}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    paddingTop: 12, borderTop: '2px solid #e5e0d5',
                    fontSize: '1.1rem', fontWeight: 700
                  }}>
                    <span>Total Amount</span>
                    <span style={{ color: '#1a1a2e' }}>${inv.total_amount}</span>
                  </div>
                </div>

                {/* Payments Made */}
                {receiptData.payments.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase',
                      letterSpacing: 1, marginBottom: 8 }}>Payments Received</p>
                    {receiptData.payments.map((p, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '8px 12px', background: '#d4edda',
                        borderRadius: 8, marginBottom: 6, fontSize: '0.85rem'
                      }}>
                        <span>
                          ✅ {p.payment_method.replace('_', ' ')} — {p.transaction_id}
                          <br /><small style={{ color: '#666' }}>
                            {new Date(p.payment_date).toLocaleDateString()}
                          </small>
                        </span>
                        <strong>${p.amount}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status */}
                <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '2px dashed #e5e0d5' }}>
                  <span style={{
                    padding: '8px 24px', borderRadius: 20,
                    background: inv.payment_status === 'paid' ? '#d4edda' : '#fde8e8',
                    color: inv.payment_status === 'paid' ? '#155724' : '#c0392b',
                    fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase',
                    letterSpacing: 1
                  }}>
                    {inv.payment_status === 'paid' ? '✅ PAID IN FULL' : `⚠️ ${inv.payment_status.toUpperCase()}`}
                  </span>
                  <p style={{ color: '#999', fontSize: '0.8rem', marginTop: 12 }}>
                    Thank you for staying at Grand Plaza Hotels
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}