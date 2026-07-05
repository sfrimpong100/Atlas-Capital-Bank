import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ReceiptData = {
  receiptNumber: string;
  reference: string;
  senderName: string;
  recipientName: string;
  recipientBank: string;
  recipientAccount: string;
  amount: string;
  fee?: string;
  status: string;
  date: string;
};

export function downloadTransferReceipt(data: ReceiptData) {
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.text("Atlas Capital Bank", 20, 20);

  doc.setFontSize(12);
  doc.text("Official Transfer Receipt", 20, 30);

  autoTable(doc, {
    startY: 40,
    theme: "grid",
    head: [["Field", "Value"]],
    body: [
      ["Receipt Number", data.receiptNumber],
      ["Reference", data.reference],
      ["Sender", data.senderName],
      ["Recipient", data.recipientName],
      ["Recipient Bank", data.recipientBank],
      ["Recipient Account", data.recipientAccount],
      ["Amount", data.amount],
      ["Transfer Fee", data.fee || "-"],
      ["Status", data.status],
      ["Date", data.date],
    ],
  });

  doc.save(`Receipt-${data.receiptNumber}.pdf`);
}

export type StatementTransaction = {
  date: string;
  description: string;
  reference: string;
  amount: string;
  status: string;
};

export function downloadStatement({
  customerName,
  accountNumber,
  currency,
  balance,
  transactions,
}: {
  customerName: string;
  accountNumber: string;
  currency: string;
  balance: string;
  transactions: StatementTransaction[];
}) {
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.text("Atlas Capital Bank", 20, 20);

  doc.setFontSize(12);
  doc.text("Official Account Statement", 20, 30);

  doc.setFontSize(11);
  doc.text(`Customer: ${customerName}`, 20, 45);
  doc.text(`Account: ${accountNumber}`, 20, 53);
  doc.text(`Currency: ${currency}`, 20, 61);
  doc.text(`Current Balance: ${balance}`, 20, 69);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 77);

  autoTable(doc, {
    startY: 90,
    theme: "striped",
    head: [["Date", "Description", "Reference", "Amount", "Status"]],
    body: transactions.map((t) => [
      t.date,
      t.description,
      t.reference,
      t.amount,
      t.status,
    ]),
  });

  doc.save(`Statement-${customerName.replace(/\s+/g, "_")}.pdf`);
}