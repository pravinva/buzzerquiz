# Google Cloud Text-to-Speech Setup Guide

This guide will help you set up Google Cloud Text-to-Speech API for natural, conversational AI voices in ICC Quiz Cards.

## Prerequisites

- A Google Cloud Platform (GCP) account
- A Vercel account (for deployment)

## Step-by-Step Setup

### 1. Enable Google Cloud Text-to-Speech API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services > Library**
4. Search for "Text-to-Speech API"
5. Click on it and click **Enable**

### 2. Create an API Key

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > API Key**
3. Copy the API key (you'll need this in the next step)
4. (Optional but recommended) Click **Restrict Key** and:
   - Under "API restrictions", select "Restrict key"
   - Choose "Cloud Text-to-Speech API" from the dropdown
   - Save

### 3. Add API Key to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **icc-quiz-cards** project
3. Go to **Settings > Environment Variables**
4. Add a new environment variable:
   - **Name**: `GOOGLE_CLOUD_TTS_API_KEY`
   - **Value**: Paste your API key from step 2
   - **Environment**: Production, Preview, and Development (select all)
5. Click **Save**

### 4. Redeploy Your Application

1. Go to the **Deployments** tab in Vercel
2. Click the **Redeploy** button on your latest deployment
3. Or push a new commit to trigger a deployment

### 5. Use AI Voices

Once deployed:

1. Open your ICC Quiz Cards application
2. Navigate to the voice settings section
3. Check the **"Use AI Voice (Google Cloud)"** checkbox
4. Select your preferred AI voice from the dropdown:
   - **US voices**: Natural, warm, deep, energetic options
   - **UK voices**: British English accents
   - **IN voices**: Indian English accents
   - **AU voices**: Australian English accents
5. Adjust voice speed and word speed as needed
6. Click **Read Aloud** to hear the natural AI voice!

## Features

- ✅ **Natural Voices**: Google Neural2 voices sound like real humans
- ✅ **Audio Caching**: Questions are cached to minimize API costs
- ✅ **Fallback**: Automatically falls back to browser voices if API fails
- ✅ **Speed Control**: Adjust voice speed from 0.5x to 2.0x
- ✅ **Multiple Accents**: US, UK, Indian, Australian English voices

## Cost Estimate

Google Cloud TTS pricing (as of 2024):

- **Neural2 voices**: $16 per 1 million characters
- **Standard voices**: $4 per 1 million characters

For a typical quiz with 100 questions averaging 50 characters each:
- Total characters: 5,000
- Cost: **~$0.08** for Neural2 voices

With caching, repeated questions cost nothing!

## Troubleshooting

### "Google Cloud TTS not configured" error

- Make sure you added `GOOGLE_CLOUD_TTS_API_KEY` to Vercel environment variables
- Ensure you redeployed after adding the variable
- Check that the API key is correct

### "Failed to generate AI voice" error

- Verify the Text-to-Speech API is enabled in your GCP project
- Check that your API key has permission to access the TTS API
- Look at browser console for detailed error messages

### Voices sound robotic

- Make sure you selected a **Neural2** voice (not Standard)
- Neural2 voices have "Neural2" in their name
- Try different Neural2 voices to find the most natural one

## Support

For issues specific to:
- **Google Cloud setup**: [GCP Support](https://cloud.google.com/support)
- **Vercel deployment**: [Vercel Support](https://vercel.com/support)
- **ICC Quiz Cards**: Create an issue in the GitHub repository

## Next Steps

Try different Neural2 voices to find the perfect narrator for your quizzes! The female US voices (Neural2-F, Neural2-C, Neural2-E) are particularly natural-sounding for educational content.
