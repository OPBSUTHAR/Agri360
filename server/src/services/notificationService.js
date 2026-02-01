const User = require('../models/User.model');
const Alert = require('../models/Alert.model');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendNotification(options) {
    const {
      type,
      userId,
      farmId,
      alertId,
      message,
      severity = 'info',
      data = {}
    } = options;

    try {
      // Get user notification preferences
      const user = await User.findById(userId);
      if (!user) return;

      const alert = alertId ? await Alert.findById(alertId) : null;

      // Prepare notification
      const notification = {
        type,
        message,
        severity,
        data,
        timestamp: new Date(),
        read: false,
        alert: alertId
      };

      // Send email if enabled
      if (user.notificationPreferences.email) {
        await this.sendEmailNotification(user, notification);
      }

      // Send SMS if enabled (requires SMS service integration)
      if (user.notificationPreferences.sms && user.phone) {
        await this.sendSMSNotification(user, notification);
      }

      // Send push notification if enabled
      if (user.notificationPreferences.push) {
        await this.sendPushNotification(user, notification);
      }

      // Store in database
      await this.storeNotification(userId, notification);

      // Emit real-time notification
      if (global.io) {
        global.io.to(userId.toString()).emit('notification:new', notification);
      }

      return true;
    } catch (error) {
      console.error('Notification error:', error);
      return false;
    }
  }

  async sendEmailNotification(user, notification) {
    const mailOptions = {
      from: `"Agri360" <${process.env.SMTP_FROM}>`,
      to: user.email,
      subject: `Agri360 ${notification.severity.toUpperCase()}: ${notification.type}`,
      html: this.getEmailTemplate(notification)
    };

    await this.transporter.sendMail(mailOptions);
  }

  getEmailTemplate(notification) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .severity { padding: 5px 10px; border-radius: 3px; color: white; }
            .critical { background: #f44336; }
            .warning { background: #ff9800; }
            .info { background: #2196F3; }
            .footer { text-align: center; padding: 20px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Agri360 Notification</h1>
            </div>
            <div class="content">
              <p><strong>Type:</strong> ${notification.type}</p>
              <p><strong>Severity:</strong> 
                <span class="severity ${notification.severity}">${notification.severity}</span>
              </p>
              <p><strong>Message:</strong> ${notification.message}</p>
              <p><strong>Time:</strong> ${notification.timestamp.toLocaleString()}</p>
              ${notification.data.details ? `<p><strong>Details:</strong> ${notification.data.details}</p>` : ''}
            </div>
            <div class="footer">
              <p>This is an automated message from Agri360 Farm Monitoring System</p>
              <p><a href="${process.env.CLIENT_URL}">View in Dashboard</a></p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async sendSMSNotification(user, notification) {
    // Integrate with SMS service like Twilio
    // This is a placeholder implementation
    console.log(`SMS to ${user.phone}: ${notification.message}`);
  }

  async sendPushNotification(user, notification) {
    // Integrate with push notification service
    // This is a placeholder implementation
    console.log(`Push notification to user ${user._id}: ${notification.message}`);
  }

  async storeNotification(userId, notification) {
    // Store notification in database
    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          $each: [notification],
          $position: 0,
          $slice: 100 // Keep only last 100 notifications
        }
      }
    });
  }

  async sendBulkNotification(farmId, notification) {
    // Send notification to all users associated with a farm
    const users = await User.find({ farms: farmId });
    
    for (const user of users) {
      await this.sendNotification({
        ...notification,
        userId: user._id
      });
    }
  }
}

module.exports = new NotificationService();