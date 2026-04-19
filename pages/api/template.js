// pages/api/template.js — Returns a downloadable CSV template with required columns and a sample row

const TEMPLATE_HEADERS = [
  'customerID','gender','SeniorCitizen','Partner','Dependents','tenure',
  'PhoneService','MultipleLines','InternetService','OnlineSecurity','OnlineBackup',
  'DeviceProtection','TechSupport','StreamingTV','StreamingMovies',
  'Contract','PaperlessBilling','PaymentMethod','MonthlyCharges','TotalCharges','Churn'
];

const SAMPLE_ROWS = [
  ['CUST-0001','Male','0','Yes','No','24','Yes','No','Fiber optic','No','Yes','No','No','Yes','No','Month-to-month','Yes','Electronic check','70.35','1687.80','No'],
  ['CUST-0002','Female','0','No','No','6','Yes','No','DSL','Yes','No','No','Yes','No','No','Month-to-month','No','Mailed check','54.90','328.40','Yes'],
  ['CUST-0003','Male','1','Yes','Yes','48','Yes','Yes','Fiber optic','No','No','Yes','No','Yes','Yes','One year','Yes','Credit card (automatic)','99.65','4801.20','No'],
];

function buildCSV(headers, rows) {
  const lines = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))];
  return lines.join('\r\n');
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const csv = buildCSV(TEMPLATE_HEADERS, SAMPLE_ROWS);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="churniq_data_template.csv"');
  res.status(200).send(csv);
}
