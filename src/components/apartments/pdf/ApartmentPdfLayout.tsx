import { Text, View, StyleSheet } from '@react-pdf/renderer';

export const apartmentPdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  rowLabel: {
    color: '#444',
  },
  rowValue: {
    textAlign: 'right',
  },
  rowBold: {
    fontWeight: 'bold',
    color: '#000',
  },
  rowNegative: {
    color: '#dc2626',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  tableTotalRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 16,
  },
  col: {
    flex: 1,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
  },
  footerLeft: { textAlign: 'left' },
  footerCenter: { textAlign: 'center' },
  footerRight: { textAlign: 'right' },
});

export function ApartmentPdfHeader({ title, address }: { title: string; address?: string }) {
  return (
    <View style={apartmentPdfStyles.header}>
      <Text style={apartmentPdfStyles.title}>{title}</Text>
      {address && <Text style={apartmentPdfStyles.subtitle}>{address}</Text>}
    </View>
  );
}

export function ApartmentPdfFooter() {
  return (
    <View style={apartmentPdfStyles.footerContainer} fixed>
      <Text style={apartmentPdfStyles.footerLeft}>{new Date().toLocaleDateString()}</Text>
      <Text style={apartmentPdfStyles.footerCenter}>{new Date().toLocaleTimeString()}</Text>
      <Text
        style={apartmentPdfStyles.footerRight}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

export function PdfRow({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  const labelStyle = [apartmentPdfStyles.rowLabel, bold ? apartmentPdfStyles.rowBold : {}];
  const valueStyle = [
    apartmentPdfStyles.rowValue,
    bold ? apartmentPdfStyles.rowBold : {},
    negative ? apartmentPdfStyles.rowNegative : {},
  ];
  return (
    <View style={apartmentPdfStyles.row}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}
