import { storeApi } from '../api';

export function canDownloadInvoice(order, invoice) {
  const pay = String(order?.payment?.status || '').toLowerCase();
  const paymentStatus = String(order?.payment_status || invoice?.payment_status || '').toLowerCase();
  return pay === 'verified' || paymentStatus === 'received';
}

export async function downloadOrderInvoice(orderId, fallbackName = 'invoice') {
  const res = await storeApi.downloadInvoice(orderId);
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  const disposition = res.headers?.['content-disposition'] || '';
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  a.href = url;
  a.download = match?.[1] || `${fallbackName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
