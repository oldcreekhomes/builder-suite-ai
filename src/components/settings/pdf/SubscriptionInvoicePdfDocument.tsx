import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 11, color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  company: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  subtitle: { fontSize: 11, color: "#6b7280", marginTop: 4 },
  invoiceLabel: { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, textAlign: "right" },
  invoiceId: { fontSize: 9, color: "#9ca3af", marginTop: 3, textAlign: "right" },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 8 },
  section: { marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  label: { color: "#6b7280" },
  value: { fontFamily: "Helvetica-Bold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 2, borderTopColor: "#e5e7eb", marginTop: 6 },
  totalLabel: { fontFamily: "Helvetica-Bold", fontSize: 14 },
  totalValue: { fontFamily: "Helvetica-Bold", fontSize: 14, color: "#059669" },
  statusPaid: { color: "#065f46", backgroundColor: "#d1fae5", padding: "2 6", borderRadius: 3, fontSize: 9, fontFamily: "Helvetica-Bold" },
  statusOther: { color: "#92400e", backgroundColor: "#fef3c7", padding: "2 6", borderRadius: 3, fontSize: 9, fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 40, textAlign: "center", color: "#9ca3af", fontSize: 10 },
});

interface InvoiceData {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
}

interface Props {
  invoice: InvoiceData;
  billingEmail: string;
}

export function SubscriptionInvoicePdfDocument({ invoice, billingEmail }: Props) {
  const amount = `$${invoice.amount.toFixed(2)}`;
  const invoiceDate = invoice.date
    ? new Date(invoice.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>BuilderSuite</Text>
            <Text style={styles.subtitle}>Subscription Invoice</Text>
          </View>
          <View>
            <Text style={styles.invoiceLabel}>Invoice</Text>
            <Text style={styles.invoiceId}>{invoice.id}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{invoiceDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={invoice.status === "paid" ? styles.statusPaid : styles.statusOther}>
              {(invoice.status || "unknown").toUpperCase()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Billing Email</Text>
            <Text style={styles.value}>{billingEmail}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{invoice.description}</Text>
            <Text style={styles.value}>{amount}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>{amount}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a receipt for your records. Thank you for your subscription!
        </Text>
      </Page>
    </Document>
  );
}
