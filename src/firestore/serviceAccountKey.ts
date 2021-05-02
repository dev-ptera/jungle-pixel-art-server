const private_value = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');

export const serviceAccount = {
  "type": "service_account",
  "project_id": "jungle-pixel-art",
  "private_key_id": "71a0de1da5513d3ff4709d06af0974c08e15767b",
  "private_key": private_value,
  "client_email": "firebase-adminsdk-ya9ou@jungle-pixel-art.iam.gserviceaccount.com",
  "client_id": "116762069232062032742",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-ya9ou%40jungle-pixel-art.iam.gserviceaccount.com"
}