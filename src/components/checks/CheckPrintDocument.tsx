import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
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

// Register MICR E-13B font for check bottom line
Font.register({
  family: 'MICR',
  src: 'https://cdn.jsdelivr.net/gh/nicholaswmin/micr-encoding-font@main/e13b-font.woff2'
});

export interface CheckData {
  check_number: string;
  check_date: string | Date;
  pay_to: string;
  payee_address?: string;
  payee_city_state?: string;
  payee_line3?: string;
  payee_line4?: string;
  amount: number;
  memo?: string;
}

export interface CompanyInfo {
  name: string;
  address?: string;
  city_state?: string;
  line3?: string;
  line4?: string;
}

export interface BankInfo {
  name: string;
  address?: string;
  city_state?: string;
  routing_number?: string;
  account_number?: string;
  routing_fraction?: string;
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

// MICR special characters for E-13B font
// Transit symbol (routing number brackets): ⑆ 
// On-Us symbol (account): ⑈
// Amount symbol: ⑇
// Dash: ⑉
const MICR_TRANSIT = '⑆';
const MICR_ON_US = '⑈';

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
  micr: {
    fontFamily: 'MICR',
    position: 'absolute',
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
        
        // Pad check number to 6 digits for MICR
        const micrCheckNumber = check.check_number.padStart(6, '0');
        
        return (
          <Page key={index} size="LETTER" style={styles.page}>
            {/* ===== CHECK SECTION (Top 3.5 inches) ===== */}
            
            {/* Company Name Line 1 - Top Left */}
            <Text style={[styles.text, { left: pt(s.company_name_x), top: pt(s.company_name_y), fontSize: 10 }]}>
              {companyInfo.name}
            </Text>
            
            {/* Company Line 2 - Address */}
            {companyInfo.address && (
              <Text style={[styles.text, { left: pt(s.company_line2_x), top: pt(s.company_line2_y), fontSize: 9 }]}>
                {companyInfo.address}
              </Text>
            )}
            
            {/* Company Line 3 */}
            {companyInfo.line3 && (
              <Text style={[styles.text, { left: pt(s.company_line3_x), top: pt(s.company_line3_y), fontSize: 9 }]}>
                {companyInfo.line3}
              </Text>
            )}
            
            {/* Company Line 4 - City/State */}
            {companyInfo.city_state && (
              <Text style={[styles.text, { left: pt(s.company_line4_x), top: pt(s.company_line4_y), fontSize: 9 }]}>
                {companyInfo.city_state}
              </Text>
            )}
            
            {/* Bank Name - Below company address */}
            <Text style={[styles.text, { left: pt(s.bank_name_x), top: pt(s.bank_name_y), fontSize: 9 }]}>
              {bankInfo.name}
            </Text>
            
            {/* Bank Line 2 - Address */}
            {bankInfo.address && (
              <Text style={[styles.text, { left: pt(s.bank_line2_x), top: pt(s.bank_line2_y), fontSize: 8 }]}>
                {bankInfo.address}
              </Text>
            )}
            
            {/* Bank Line 3 - City/State */}
            {bankInfo.city_state && (
              <Text style={[styles.text, { left: pt(s.bank_line3_x), top: pt(s.bank_line3_y), fontSize: 8 }]}>
                {bankInfo.city_state}
              </Text>
            )}
            
            {/* Check Number - Top Right */}
            <Text style={[styles.text, styles.bold, { left: pt(s.check_number_x), top: pt(s.check_number_y), fontSize: 11 }]}>
              {check.check_number}
            </Text>
            
            {/* Routing Fraction - Top right area (e.g., "65-109/550") */}
            {bankInfo.routing_fraction && (
              <Text style={[styles.text, { left: pt(s.routing_fraction_x), top: pt(s.routing_fraction_y), fontSize: 9 }]}>
                {bankInfo.routing_fraction}
              </Text>
            )}
            
            {/* Date Label with value - Center area */}
            <Text style={[styles.text, { left: pt(s.date_label_x), top: pt(s.date_label_y), fontSize: 10 }]}>
              Date: {format(checkDate, 'MM/dd/yyyy')}
            </Text>
            
            {/* PAY label */}
            <Text style={[styles.text, styles.bold, { left: pt(s.pay_label_x), top: pt(s.pay_label_y), fontSize: 9 }]}>
              PAY
            </Text>
            
            {/* TO THE label */}
            <Text style={[styles.text, styles.bold, { left: pt(s.to_the_label_x), top: pt(s.to_the_label_y), fontSize: 9 }]}>
              TO THE
            </Text>
            
            {/* ORDER OF: label */}
            <Text style={[styles.text, styles.bold, { left: pt(s.order_of_label_x), top: pt(s.order_of_label_y), fontSize: 9 }]}>
              ORDER OF:
            </Text>
            
            {/* Payee Line 1 - Name */}
            <Text style={[styles.text, { left: pt(s.payee_x), top: pt(s.payee_y), fontSize: 10 }]}>
              {check.pay_to}
            </Text>
            
            {/* Payee Line 2 - Address */}
            {check.payee_address && (
              <Text style={[styles.text, { left: pt(s.payee_line2_x), top: pt(s.payee_line2_y), fontSize: 9 }]}>
                {check.payee_address}
              </Text>
            )}
            
            {/* Payee Line 3 */}
            {check.payee_line3 && (
              <Text style={[styles.text, { left: pt(s.payee_line3_x), top: pt(s.payee_line3_y), fontSize: 9 }]}>
                {check.payee_line3}
              </Text>
            )}
            
            {/* Payee Line 4 - City/State */}
            {check.payee_city_state && (
              <Text style={[styles.text, { left: pt(s.payee_line4_x), top: pt(s.payee_label_y), fontSize: 9 }]}>
                {check.payee_city_state}
              </Text>
            )}
            
            {/* Amount Numeric */}
            <Text style={[styles.text, styles.bold, { left: pt(s.amount_numeric_x), top: pt(s.amount_numeric_y), fontSize: 11 }]}>
              {formatAmountNumeric(check.amount)}
            </Text>
            
            {/* Amount in Words with asterisk padding */}
            <Text style={[styles.text, { left: pt(s.amount_words_x), top: pt(s.amount_words_y), fontSize: 9 }]}>
              {formatAmountWords(check.amount)}
            </Text>
            
            {/* AUTHORIZED SIGNATURE label */}
            <Text style={[styles.text, { left: pt(s.signature_label_x), top: pt(s.signature_label_y), fontSize: 8 }]}>
              AUTHORIZED SIGNATURE
            </Text>
            
            {/* ===== MICR LINE (Bottom of check) - Using MICR E-13B font ===== */}
            
            {/* MICR: Check Number (left) */}
            <Text style={[styles.micr, { left: pt(s.micr_check_number_x), top: pt(s.micr_check_number_y), fontSize: 12 }]}>
              {MICR_ON_US}{micrCheckNumber}{MICR_ON_US}
            </Text>
            
            {/* MICR: Routing Number (center) with transit symbols */}
            {bankInfo.routing_number && (
              <Text style={[styles.micr, { left: pt(s.micr_routing_x), top: pt(s.micr_routing_y), fontSize: 12 }]}>
                {MICR_TRANSIT}{bankInfo.routing_number}{MICR_TRANSIT}
              </Text>
            )}
            
            {/* MICR: Account Number (right) with on-us symbol */}
            {bankInfo.account_number && (
              <Text style={[styles.micr, { left: pt(s.micr_account_x), top: pt(s.micr_account_y), fontSize: 12 }]}>
                {bankInfo.account_number}{MICR_ON_US}
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

// Test page document that prints EXACT SAMPLE DATA for alignment calibration
export function CheckPrintTestDocument({ settings }: { settings?: Partial<CheckPrintSettings> }) {
  const s = { ...DEFAULT_PRINT_SETTINGS, ...settings };
  
  // Hardcoded sample data matching the Sandy Spring Bank check stock exactly
  const SAMPLE = {
    // Company (top left)
    company_line1: "OCH at Oceanwatch, LLC",
    company_line2: "228 S. Washington Street",
    company_line3: "Suite B-30 North",
    company_line4: "Alexandria, VA 22314",
    
    // Bank info (below company)
    bank_line1: "Sandy Spring Bank",
    bank_line2: "17801 Georgia Avenue",
    bank_line3: "Olney, MD 20832",
    
    // Top right
    routing_fraction: "65-109/550",
    check_number: "1004",
    
    // Date
    date: "01/21/2026",
    
    // Payee
    payee_line1: "Old Creek Homes, LLC",
    payee_line2: "228 S. Washington Street",
    payee_line3: "Suite B-30 North",
    payee_line4: "Alexandria, VA 22314",
    
    // Amount
    amount: 44.64,
    amount_numeric: "**44.64",
    
    // MICR line
    micr_check_number: "001004",
    micr_routing: "055001096",
    micr_account: "18705498011",
  };
  
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* ===== CHECK SECTION ===== */}
        
        {/* Company Lines */}
        <Text style={[styles.text, { left: pt(s.company_name_x), top: pt(s.company_name_y), fontSize: 10 }]}>
          {SAMPLE.company_line1}
        </Text>
        <Text style={[styles.text, { left: pt(s.company_line2_x), top: pt(s.company_line2_y), fontSize: 9 }]}>
          {SAMPLE.company_line2}
        </Text>
        <Text style={[styles.text, { left: pt(s.company_line3_x), top: pt(s.company_line3_y), fontSize: 9 }]}>
          {SAMPLE.company_line3}
        </Text>
        <Text style={[styles.text, { left: pt(s.company_line4_x), top: pt(s.company_line4_y), fontSize: 9 }]}>
          {SAMPLE.company_line4}
        </Text>
        
        {/* Bank Lines */}
        <Text style={[styles.text, { left: pt(s.bank_name_x), top: pt(s.bank_name_y), fontSize: 9 }]}>
          {SAMPLE.bank_line1}
        </Text>
        <Text style={[styles.text, { left: pt(s.bank_line2_x), top: pt(s.bank_line2_y), fontSize: 8 }]}>
          {SAMPLE.bank_line2}
        </Text>
        <Text style={[styles.text, { left: pt(s.bank_line3_x), top: pt(s.bank_line3_y), fontSize: 8 }]}>
          {SAMPLE.bank_line3}
        </Text>
        
        {/* Check Number - Top Right */}
        <Text style={[styles.text, styles.bold, { left: pt(s.check_number_x), top: pt(s.check_number_y), fontSize: 11 }]}>
          {SAMPLE.check_number}
        </Text>
        
        {/* Routing Fraction */}
        <Text style={[styles.text, { left: pt(s.routing_fraction_x), top: pt(s.routing_fraction_y), fontSize: 9 }]}>
          {SAMPLE.routing_fraction}
        </Text>
        
        {/* Date Label */}
        <Text style={[styles.text, { left: pt(s.date_label_x), top: pt(s.date_label_y), fontSize: 10 }]}>
          Date: {SAMPLE.date}
        </Text>
        
        {/* PAY / TO THE / ORDER OF: labels */}
        <Text style={[styles.text, styles.bold, { left: pt(s.pay_label_x), top: pt(s.pay_label_y), fontSize: 9 }]}>
          PAY
        </Text>
        <Text style={[styles.text, styles.bold, { left: pt(s.to_the_label_x), top: pt(s.to_the_label_y), fontSize: 9 }]}>
          TO THE
        </Text>
        <Text style={[styles.text, styles.bold, { left: pt(s.order_of_label_x), top: pt(s.order_of_label_y), fontSize: 9 }]}>
          ORDER OF:
        </Text>
        
        {/* Payee Lines */}
        <Text style={[styles.text, { left: pt(s.payee_x), top: pt(s.payee_y), fontSize: 10 }]}>
          {SAMPLE.payee_line1}
        </Text>
        <Text style={[styles.text, { left: pt(s.payee_line2_x), top: pt(s.payee_line2_y), fontSize: 9 }]}>
          {SAMPLE.payee_line2}
        </Text>
        <Text style={[styles.text, { left: pt(s.payee_line3_x), top: pt(s.payee_line3_y), fontSize: 9 }]}>
          {SAMPLE.payee_line3}
        </Text>
        <Text style={[styles.text, { left: pt(s.payee_line4_x), top: pt(s.payee_label_y), fontSize: 9 }]}>
          {SAMPLE.payee_line4}
        </Text>
        
        {/* Amount Numeric */}
        <Text style={[styles.text, styles.bold, { left: pt(s.amount_numeric_x), top: pt(s.amount_numeric_y), fontSize: 11 }]}>
          {SAMPLE.amount_numeric}
        </Text>
        
        {/* Amount in Words */}
        <Text style={[styles.text, { left: pt(s.amount_words_x), top: pt(s.amount_words_y), fontSize: 9 }]}>
          {formatAmountWords(SAMPLE.amount)}
        </Text>
        
        {/* AUTHORIZED SIGNATURE */}
        <Text style={[styles.text, { left: pt(s.signature_label_x), top: pt(s.signature_label_y), fontSize: 8 }]}>
          AUTHORIZED SIGNATURE
        </Text>
        
        {/* ===== MICR LINE - Using MICR E-13B font ===== */}
        <Text style={[styles.micr, { left: pt(s.micr_check_number_x), top: pt(s.micr_check_number_y), fontSize: 12 }]}>
          {MICR_ON_US}{SAMPLE.micr_check_number}{MICR_ON_US}
        </Text>
        <Text style={[styles.micr, { left: pt(s.micr_routing_x), top: pt(s.micr_routing_y), fontSize: 12 }]}>
          {MICR_TRANSIT}{SAMPLE.micr_routing}{MICR_TRANSIT}
        </Text>
        <Text style={[styles.micr, { left: pt(s.micr_account_x), top: pt(s.micr_account_y), fontSize: 12 }]}>
          {SAMPLE.micr_account}{MICR_ON_US}
        </Text>
        
        {/* ===== STUB SECTION ===== */}
        <Text style={[styles.text, { left: pt(s.stub_company_x), top: pt(s.stub_company_y), fontSize: 9 }]}>
          {SAMPLE.company_line1}
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_payee_x), top: pt(s.stub_payee_y), fontSize: 9 }]}>
          {SAMPLE.payee_line1}
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_date_check_x), top: pt(s.stub_date_check_y), fontSize: 9 }]}>
          Date: {SAMPLE.date}  Check #: {SAMPLE.check_number}
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_invoice_date_x), top: pt(s.stub_invoice_date_y), fontSize: 9 }]}>
          {SAMPLE.date}
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_amount_x), top: pt(s.stub_amount_y), fontSize: 9 }]}>
          {SAMPLE.amount.toFixed(2)}
        </Text>
        <Text style={[styles.text, { left: pt(s.stub_bank_x), top: pt(s.stub_bank_y), fontSize: 9 }]}>
          {SAMPLE.bank_line1}
        </Text>
        <Text style={[styles.text, styles.bold, { left: pt(s.stub_total_x), top: pt(s.stub_total_y), fontSize: 9 }]}>
          {SAMPLE.amount.toFixed(2)}
        </Text>
      </Page>
    </Document>
  );
}
