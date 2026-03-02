# Birthday Bucket

A desktop app for managing birthdays from ChurchSuite. Syncs contact and children data, displays upcoming birthdays by week, and exports PowerPoint slides for church service display.

## Features

- **Sync** birthday data from ChurchSuite API (Address Book contacts + Children module)
- **View** this week's and next week's birthdays with name, date, day, and age
- **Export** PPTX files with person name and placeholder space for manually adding photos

## Setup

### Prerequisites

- Node.js 18+
- A ChurchSuite account with API access

### Install

```bash
cd birthday-bucket
npm install
```

### Configuration

Copy the example environment file and fill in your ChurchSuite credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `CHURCHSUITE_ACCOUNT` | Your ChurchSuite subdomain (e.g. `demo`) |
| `CHURCHSUITE_API_KEY` | API key from ChurchSuite support |
| `CHURCHSUITE_APP_NAME` | Application identifier (default: `birthday-bucket`) |

You can also enter credentials directly in the app UI.

### Run (Development)

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

## Usage

1. Enter your ChurchSuite API credentials in the Connection panel
2. Click **Sync Now** to download birthday data
3. View birthdays for **This Week** or **Next Week**
4. Click **Export PPTX** to generate a PowerPoint file
5. Open the PPTX and add photos to the placeholder areas manually

## ChurchSuite API

This tool uses the [ChurchSuite API](https://github.com/ChurchSuite/churchsuite-api):

- `GET /v1/addressbook/contacts` — fetches contacts with `date_of_birth`
- `GET /v1/children/children` — fetches children with `date_of_birth`

API keys are obtained by contacting support@churchsuite.com.

## PPTX Output

Each exported file contains:
- A title slide with the week range and birthday count
- One slide per person with:
  - Their name
  - Birthday day and date
  - A dashed placeholder rectangle for adding a photo manually
