import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";

dotenv.config();

// Cấu hình Brevo
const brevoClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = brevoClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async (recipientEmail, customSubject, htmlContent) => {
  // Khởi tạo một cái sendSmtpEmail
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  // Tài khoản gửi email: Là tài khoản admin email, đăng ký tài khoản trên brevo
  sendSmtpEmail.sender = {
    email: process.env.ADMIN_EMAIL_ADDRESS,
    name: process.env.ADMIN_EMAIL_NAME,
  };
  // Những tài khoản nhận mail
  // 'to' phải là 1 array để sau có thể tuỳ biến gửi email đến nhiều users
  sendSmtpEmail.to = [{ email: recipientEmail }];
  // Tiêu đề của email
  sendSmtpEmail.subject = customSubject;
  // Nội dung của email dạng HTML
  sendSmtpEmail.htmlContent = htmlContent;
  // Gọi hành động gửi email
  return tranEmailApi.sendTransacEmail(sendSmtpEmail);
};

const BrevoProvider = {
  sendEmail,
};

export default BrevoProvider;
