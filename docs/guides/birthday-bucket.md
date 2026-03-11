# Birthday Bucket (ChurchSuite Integration)

[← Back to Home](../index.md) | [User Guide](../user-guide)

---

Generate birthday blessing PowerPoint slides automatically by syncing contacts and children from your ChurchSuite account.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [ChurchSuite OAuth2 Setup](#churchsuite-oauth2-setup)
4. [Using Birthday Bucket](#using-birthday-bucket)
5. [Customizing Slides](#customizing-slides)
6. [How It Works](#how-it-works)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Birthday Bucket connects to your ChurchSuite account and:

1. **Syncs** contacts and children with date-of-birth records
2. **Filters** to birthdays happening this week or next week
3. **Generates** a PowerPoint presentation with birthday blessing slides

Each export produces a ready-to-import PPTX with:
- A **title slide** showing "Happy Birthday from [Your Church]!" and the week date range
- **Per-person slides** with name, greeting, and photo placeholder
- A **song slide** with "Jesus bless you today!" and all birthday names

---

## Prerequisites

- **ProPresenter Lyrics** desktop app (v3.2.0+)
- A **ChurchSuite** account with admin access to create API credentials
- Contacts and/or children in ChurchSuite with **date of birth** fields populated

---

## ChurchSuite OAuth2 Setup

Birthday Bucket uses OAuth2 Client Credentials to authenticate with ChurchSuite's Core API v2. You need to create an API client in your ChurchSuite admin panel.

### Step 1: Create API Credentials

1. Log in to your **ChurchSuite admin** account
2. Navigate to **Admin** → **API Secrets** (or **Integrations** → **API**)
3. Click **Create new API secret** (or **Add client**)
4. Configure the client:
   - **Name**: `ProPresenter Birthday Bucket` (or any descriptive name)
   - **Grant type**: Client Credentials
   - **Modules**: Enable access to **Address Book** and **Children** modules
5. Save and note the **Client ID** and **Client Secret**

> **Important:** Store your Client Secret securely. It cannot be retrieved after creation — only regenerated.

### Step 2: Enter Credentials in the App

1. Open **ProPresenter Lyrics**
2. Click the **Birthday Bucket** button in the header
3. In the **ChurchSuite Connection** panel:
   - Enter your **Client ID**
   - Enter your **Client Secret**
4. Click **Sync Now** to test the connection

The app securely stores your credentials locally using Electron's encrypted store. Tokens are cached in memory and refreshed automatically before expiry.

---

## Using Birthday Bucket

### Syncing Contacts

1. Click **Sync Now** to fetch contacts and children from ChurchSuite
2. The sync panel shows:
   - Number of **contacts** with birthdays found
   - Number of **children** with birthdays found
   - **Last synced** timestamp
3. Re-sync anytime to pick up new contacts or updated dates

### Browsing Birthdays

After syncing, toggle between:
- **This Week** — birthdays from Monday to Sunday of the current week
- **Next Week** — birthdays for the following week

Each birthday card shows:
- **Name** (first and last)
- **Day** of the week (e.g., "Saturday")
- **Date** formatted (e.g., "15 March")
- **Turning age** (calculated from year of birth)
- **Source badge** — whether the person is from Contacts or Children

### Exporting to PowerPoint

1. Select the target week (**This Week** or **Next Week**)
2. Click **Export PPTX**
3. Choose a save location
4. The generated file is ready to import into ProPresenter

Use **Open Output Folder** to quickly navigate to the export directory.

---

## Customizing Slides

### Church Name

Set your church name in the **Slides** panel. This appears on the title slide:

> "Happy Birthday from **[Your Church Name]**!"

### Background Image

Optionally set a custom background image (PNG or JPG) for all slides:

1. Click **Choose Background Image** in the Slides panel
2. Select a `.png` or `.jpg` file
3. The image is stretched to fill each slide

If no background image is set, slides use a warm amber gradient as the default.

### Slide Layout

The generated PowerPoint follows this structure:

| Slide | Content |
|---|---|
| **Title** | Church name + "Happy Birthday!" + week date range |
| **Per-person** (one each) | Name at 40pt + "Happy Birthday" greeting + photo placeholder box |
| **Song** | "Jesus bless you today!" (x2) + all birthday names + "Jesus bless you always!" |

---

## How It Works

```
App UI → IPC → OAuth2 token request (if needed)
                     ↓
           POST https://login.churchsuite.com/oauth2/token
           (Client Credentials grant)
                     ↓
              Bearer token cached
                     ↓
         GET /v2/addressbook/contacts (all pages)
         GET /v2/children/children    (all pages)
                     ↓
          Filter by date_of_birth → cache
                     ↓
         Display by week → Export PPTX
```

1. **Authentication**: OAuth2 Client Credentials grant exchanges your Client ID + Secret for a Bearer token. Tokens are cached and auto-refreshed with a 60-second buffer before expiry.
2. **Data fetch**: Contacts and children are fetched in parallel with automatic pagination (100 per page).
3. **Filtering**: Only people with a valid `date_of_birth` field are included (empty or `0000-00-00` values are excluded).
4. **Birthday matching**: The app checks if each person's birthday (month + day) falls within the selected week (Monday–Sunday), handling leap year edge cases.
5. **PPTX generation**: Slides are built using `pptxgenjs` with the configured church name and background image.

---

## Troubleshooting

### "Sync failed" or authentication errors

- **Double-check your Client ID and Client Secret** — re-enter them carefully
- Ensure the API client in ChurchSuite has access to the **Address Book** and **Children** modules
- Verify your ChurchSuite account has admin permissions to create API secrets

### No birthdays showing

- Click **Sync Now** to refresh data from ChurchSuite
- Check that contacts/children in ChurchSuite have their **date of birth** field filled in
- Toggle between **This Week** and **Next Week** — there may simply be no birthdays in the selected week
- Remember: only people with a valid date of birth are included

### Token or session errors

- The app automatically refreshes tokens before they expire
- If you see persistent token errors, try removing and re-entering your credentials
- OAuth2 tokens are cached in memory only — restarting the app requests a fresh token

### PPTX export issues

- Ensure you have at least one birthday in the selected week before exporting
- Check that your output folder is writable
- If the background image doesn't appear, verify the file path is correct and the image is a valid PNG or JPG

---

## Related Guides

- **[PPTX Export](./pptx-export)** — Customize song lyric exports
- **[After Export](./after-export)** — Import birthday slides and other content into ProPresenter
- **[Service Generator](./service-generator)** — Automate playlist building from PDFs

## Need Help?

- Check the [FAQ](../faq) for common issues
- Open an [issue on GitHub](https://github.com/adamswbrown/propresenterlyricexport/issues)
