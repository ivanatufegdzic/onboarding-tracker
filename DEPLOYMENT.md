# Deploy to Google Cloud Run

Follow these steps to deploy the app to Google Cloud so Kat and your team can access it anytime.

## Prerequisites

- Google Cloud account (your company already has one)
- Google Cloud CLI installed ([download here](https://cloud.google.com/sdk/docs/install))
- Project ID from your Google Cloud console

## Step 1: Set Up Google Cloud CLI

```bash
# Login to your Google Cloud account
gcloud auth login

# Set your project
gcloud config set project YOUR-PROJECT-ID
```

Replace `YOUR-PROJECT-ID` with your actual project ID (ask your IT team if you're not sure).

## Step 2: Prepare the App

The app needs your Gmail password as a secret in Google Cloud.

```bash
# Create a secret in Google Cloud for Gmail password
gcloud secrets create GMAIL_APP_PASSWORD --data-file=<(echo "your-app-password-here")

# Verify it was created
gcloud secrets list
```

Replace `your-app-password-here` with the Gmail App Password you set up earlier.

## Step 3: Deploy to Cloud Run

Run this command from inside the project folder:

```bash
gcloud run deploy onboarding-tracker \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GMAIL_USER=ivana_tufegdzic@greenerfield.com,GMAIL_APP_PASSWORD=your-app-password-here \
  --memory 512Mi \
  --timeout 3600
```

**Wait 2-5 minutes** for deployment to complete.

## Step 4: Get Your App URL

After deployment succeeds, Google will show you a URL like:

```
https://onboarding-tracker-abc123.run.app
```

**Copy this URL** — this is what you share with Kat and your team!

## Step 5: Share with Your Team

Send Kat the URL. She can now:
- Access the app from anywhere
- Create cohorts and hires
- Mark tasks complete
- Export reports
- See overdue alerts

The app is **always on** and auto-scales based on usage.

---

## Cost

- **Free tier**: Up to 2 million requests/month
- **Typical usage**: ~$0.50-2.00/month for a small team
- **No setup costs**

Your IT team can set up billing alerts if needed.

---

## Troubleshooting

### Deployment fails with permission error
- Ask your IT team for Cloud Run deployment permissions
- Make sure you're in the right project: `gcloud config list`

### App shows error on the URL
- Check logs: `gcloud run logs read onboarding-tracker --limit 50`
- Make sure GMAIL_USER and GMAIL_APP_PASSWORD are correct

### Need to update the app
- Make changes locally
- Run the same `gcloud run deploy` command again
- It will update the app without downtime

### Need to stop/delete the app
```bash
gcloud run services delete onboarding-tracker
```

---

## For Your IT Team

If your IT team needs to handle this:

1. Create a Google Cloud Secret for the Gmail App Password
2. Set up IAM permissions for Cloud Run deployment
3. Run the gcloud run deploy command with the correct environment variables
4. Share the generated URL with end users

The app stores data in-memory (data.json gets recreated on restart). For persistent storage, add Google Cloud Firestore or Cloud Storage integration.

---

**Questions?** Check the main [README.md](README.md) or ask your Google Cloud admin.
