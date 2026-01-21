import { Document, Page, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { CheckPrintSettings, DEFAULT_PRINT_SETTINGS } from '@/hooks/useCheckPrintSettings';

// Register Courier font for consistent check printing
Font.register({
  family: 'Courier',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/courierprime/v7/u-450q2lgwslOqpF_6gQ8kELWwZjW-Y.woff2' },
    { src: 'https://fonts.gstatic.com/s/courierprime/v7/u-4k0q2lgwslOqpF_6gQ8kELY7pMf-c.woff2', fontWeight: 'bold' },
  ],
});

export interface CheckData {
  check_number: string;
  check_date: string | Date;
  pay_to: string;
  payee_address?: string;
  payee_city_state?: string;
  amount: number;
  memo?: string;
}

export interface CompanyInfo {
  name: string;
  address?: string;
  city_state?: string;
}

export interface BankInfo {
  name: string;
}

interface CheckPrintDocumentProps {
  checks: CheckData[];
  settings?: Partial<CheckPrintSettings>;
  companyInfo: CompanyInfo;
  bankInfo: BankInfo;
}

// Convert inches to points (72 points per inch)
const pt = (inches: number) => inches * 72;

// Convert number to words for check amount
const numberToWords = (amount: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  
  const convertHundreds = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundreds(n % 100) : '');
  };
  
  const convertNumber = (n: number): string => {
    if (n === 0) return 'Zero';
    if (n < 1000) return convertHundreds(n);
    if (n < 1000000) {
      return convertHundreds(Math.floor(n / 1000)) + ' Thousand' + 
        (n % 1000 !== 0 ? ' ' + convertHundreds(n % 1000) : '');
    }
    if (n < 1000000000) {
      return convertHundreds(Math.floor(n / 1000000)) + ' Million' + 
        (n % 1000000 !== 0 ? ' ' + convertNumber(n % 1000000) : '');
    }
    return convertHundreds(Math.floor(n / 1000000000)) + ' Billion' + 
      (n % 1000000000 !== 0 ? ' ' + convertNumber(n % 1000000000) : '');
  };
  
  const dollarsInWords = convertNumber(dollars);
  const centsText = cents > 0 ? ` and ${cents}/100` : ' and 00/100';
  
  return dollarsInWords + centsText + ' Dollars';
};

// Pad amount words with asterisks for security
const formatAmountWords = (amount: number, maxLength: number = 60): string => {
  const words = numberToWords(amount);
  const padding = '*'.repeat(Math.max(0, maxLength - words.length));
  return words + padding;
};

// Format currency with leading asterisks for security
const formatAmountNumeric = (amount: number): string => {
  return '**' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Courier',
    fontSize: 10,
  },
  text: {
    position: 'absolute',
  },
  bold: {
    fontWeight: 'bold',
  },
});

export function CheckPrintDocument({ checks, settings, companyInfo, bankInfo }: CheckPrintDocumentProps) {
  // Merge provided settings with defaults
  const s = { ...DEFAULT_PRINT_SETTINGS, ...settings };
  
  return (
    <Document>
      {checks.map((check, index) => {
        const checkDate = typeof check.check_date === 'string' 
          ? new Date(check.check_date) 
          : check.check_date;
        
        return (
          <Page key={index} size="LETTER" style={styles.page}>
            {/* ===== CHECK SECTION (Top 3.5 inches) ===== */}
            
            {/* Company Name - Top Left */}
            <Text style={[styles.text, { left: pt(s.company_name_x), top: pt(s.company_name_y), fontSize: 10 }]}>
              {companyInfo.name}
            </Text>
            {companyInfo.address && (
              <Text style={[styles.text, { left: pt(s.company_name_x), top: pt(s.company_name_y + 0.15), fontSize: 9 }]}>
                {companyInfo.address}
              </Text>
            )}
            {companyInfo.city_state && (
              <Text style={[styles.text, { left: pt(s.company_name_x), top: pt(s.company_name_y + 0.30), fontSize: 9 }]}>
                {companyInfo.city_state}
              </Text>
            )}
            
            {/* Check Number - Top Right */}
            <Text style={[styles.text, styles.bold, { left: pt(s.check_number_x), top: pt(s.check_number_y), fontSize: 11 }]}>
              CHECK NO. {check.check_number}
            </Text>
            
            {/* Date */}
            <Text style={[styles.text, { left: pt(s.date_x), top: pt(s.date_y), fontSize: 10 }]}>
              {format(checkDate, 'MM/dd/yyyy')}
            </Text>
            
            {/* Amount in Words with asterisk padding */}
            <Text style={[styles.text, { left: pt(s.amount_words_x), top: pt(s.amount_words_y), fontSize: 9 }]}>
              {formatAmountWords(check.amount)}
            </Text>
            
            {/* Amount Numeric */}
            <Text style={[styles.text, styles.bold, { left: pt(s.amount_numeric_x), top: pt(s.amount_numeric_y), fontSize: 11 }]}>
              {formatAmountNumeric(check.amount)}
            </Text>
            
            {/* Pay To - Payee Name and Address */}
            <Text style={[styles.text, { left: pt(s.payee_x), top: pt(s.payee_y), fontSize: 10 }]}>
              {check.pay_to}
            </Text>
            {check.payee_address && (
              <Text style={[styles.text, { left: pt(s.payee_x), top: pt(s.payee_y + 0.15), fontSize: 9 }]}>
                {check.payee_address}
              </Text>
            )}
            {check.payee_city_state && (
              <Text style={[styles.text, { left: pt(s.payee_x), top: pt(s.payee_y + 0.30), fontSize: 9 }]}>
                {check.payee_city_state}
              </Text>
            )}
            
            {/* ===== STUB SECTION (Below check) ===== */}
            
            {/* Stub: Company Name */}
            <Text style={[styles.text, { left: pt(s.stub_company_x), top: pt(s.stub_company_y), fontSize: 9 }]}>
              {companyInfo.name}
            </Text>
            
            {/* Stub: Payee */}
            <Text style={[styles.text, { left: pt(s.stub_payee_x), top: pt(s.stub_payee_y), fontSize: 9 }]}>
              {check.pay_to}
            </Text>
            
            {/* Stub: Date + Check # */}
            <Text style={[styles.text, { left: pt(s.stub_date_check_x), top: pt(s.stub_date_check_y), fontSize: 9 }]}>
              Date: {format(checkDate, 'MM/dd/yyyy')}  Check #: {check.check_number}
            </Text>
            
            {/* Stub: Invoice Date */}
            <Text style={[styles.text, { left: pt(s.stub_invoice_date_x), top: pt(s.stub_invoice_date_y), fontSize: 9 }]}>
              {format(checkDate, 'M/dd/yyyy')}
            </Text>
            
            {/* Stub: Amount */}
            <Text style={[styles.text, { left: pt(s.stub_amount_x), top: pt(s.stub_amount_y), fontSize: 9 }]}>
              {check.amount.toFixed(2)}
            </Text>
            
            {/* Stub: Bank Name (bottom left) */}
            <Text style={[styles.text, { left: pt(s.stub_bank_x), top: pt(s.stub_bank_y), fontSize: 9 }]}>
              {bankInfo.name}
            </Text>
            
            {/* Stub: Total (bottom right) */}
            <Text style={[styles.text, styles.bold, { left: pt(s.stub_total_x), top: pt(s.stub_total_y), fontSize: 9 }]}>
              {check.amount.toFixed(2)}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
}

// Test page document that prints field labels for alignment calibration
export function CheckPrintTestDocument({ settings }: { settings?: Partial<CheckPrintSettings> }) {
  const s = { ...DEFAULT_PRINT_SETTINGS, ...settings };
  
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Check section labels */}
        <Text style={[styles.text, { left: pt(s.company_name_x), top: pt(s.company_name_y), fontSize: 8 }]}>
          [COMPANY NAME]
        </Text>
        <Text style={[styles.text, { left: pt(s.check_number_x), top: pt(s.check_number_y), fontSize: 8 }]}>
          [CHECK #]
        </Text>
        <Text style={[styles.text, { left: pt(s.date_x), top: pt(s.date_y), fontSize: 8 }]}>
          [DATE]
        </Text>
        <Text style={[styles.text, { left: pt(s.amount_words_x), top: pt(s.amount_words_y), fontSize: 8 }]}>
          [AMOUNT IN WORDS]
        </Text>
        <Text style={[styles.text, { left: pt(s.amount_numeric_x), top: pt(s.amount_numeric_y), fontSize: 8 }]}>
          [$AMOUNT]
        </Text>
        <Text style={[styles.text, { left: pt(s.payee_x), top: pt(s.payee_y), fontSize: 8 }]}>
          [PAYEE NAME]
        </Text>
        
        {/* Stub section labels */}
        <Text style={[styles.text, { left: pt(s.stub_company_x), top: pt(s.stub_company_y), fontSize: 8 }]}>
          [STUB: COMPANY]
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_payee_x), top: pt(s.stub_payee_y), fontSize: 8 }]}>
          [STUB: PAYEE]
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_date_check_x), top: pt(s.stub_date_check_y), fontSize: 8 }]}>
          [STUB: DATE/CHECK#]
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_invoice_date_x), top: pt(s.stub_invoice_date_y), fontSize: 8 }]}>
          [STUB: INV DATE]
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_amount_x), top: pt(s.stub_amount_y), fontSize: 8 }]}>
          [STUB: AMT]
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_bank_x), top: pt(s.stub_bank_y), fontSize: 8 }]}>
          [STUB: BANK]
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_total_x), top: pt(s.stub_total_y), fontSize: 8 }]}>
          [STUB: TOTAL]
        </Text>
      </Page>
    </Document>
  );
}
