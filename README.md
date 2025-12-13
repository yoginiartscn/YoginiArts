# Yogini Arts – Sacred Art & Sound Experience Platform

Yogini Arts is a beautifully crafted front-end experience designed to showcase the sacred artistry of Thangka paintings and the healing resonance of Tibetan sound bowls. Inspired by the brand's commitment to tradition, craftsmanship, and spiritual heritage, the platform visually presents the essence of Yogini Arts through elegant UI design, immersive storytelling, and rich cultural content.

## About Yogini Arts

Yogini Arts is dedicated to bringing authentic Himalayan art and sound-healing culture into modern appreciation. All artworks and sacred items — including hand-crafted Thangka and meticulously engraved singing bowls — are sourced from Nepal and created by experienced local artisans.

The platform highlights three key pillars:

## The Art of Thangka

Thangka (唐卡) is a traditional Tibetan Buddhist art form known for its sacred symbolism, precise craftsmanship, and spiritual significance.
The front-end presentation includes:

* Detailed visuals of authentic, hand-painted Thangka
* Cultural background and artistic explanations
* Artisan-made craftsmanship descriptions
* Symbolism breakdown and close-up artwork imagery

## The Sound of Healing

Yogini Arts features specially engraved, artisan-crafted sound bowls designed for meditation and healing practices.
The front-end modules include:

* High-resolution product showcases
* Descriptions of sound-healing principles
* Bowl engraving details and meaning
* Visual storytelling of the crafting process

## Sacred Items & Spiritual Connection

A dedicated section guides visitors in finding meaningful sacred objects and understanding their spiritual value.
Content includes:

* Guidance on choosing Thangka and healing bowls
* Cultural significance of sacred items
* Authenticity assurance and artisan heritage
* Visual narration of customers connecting with their chosen artworks

## Front-End Highlights

* Elegant museum-style layout for showcasing sacred art
* Warm, spiritual visual theme aligned with Yogini Arts branding
* High-quality imagery featuring Thangka, sound bowls, and artisan craftsmanship
* Bilingual presentation (Chinese + English) for international accessibility
* Smooth modular content sections for easy reading and visual flow
* QR-integrated contact section for WeChat and customer inquiries

## Technology Stack

* **React 19** - Modern UI library
* **Vite** - Fast build tool and dev server
* **Tailwind CSS 4** - Utility-first CSS framework
* **React Router** - Client-side routing
* **i18next** - Internationalization (English & Chinese)

## Getting Started

### Prerequisites

* Node.js (v18 or higher)
* npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yoginiartscn/YoginiArts.git
cd YoginiArts
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and fill in your values (optional for basic setup)
# For now, you can leave it empty if you're not using a backend API
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3300`

### Environment Variables

The `.env` file is used to configure your application. Here's what each variable does:

- **VITE_API_BASE_URL**: Backend API URL (if you add a backend later)
  - Example: `http://localhost:5000/api` or `https://api.yoginiarts.com/api`
  
- **VITE_ASSET_BASE_URL**: CDN or asset hosting URL (for images/assets)
  - Example: `https://cdn.yoginiarts.com` or `https://res.cloudinary.com/your-cloud-name`
  
- **VITE_APP_TITLE**: Website title (defaults to "Yogini Arts - Sacred Art & Sound Experience")
  
- **VITE_APP_DESCRIPTION**: Website description for SEO
  
- **VITE_CONTACT_EMAIL**: Contact email address
  
- **VITE_CONTACT_PHONE**: Contact phone number
  
- **VITE_WECHAT_QR_URL**: WeChat QR code image URL

**Important Notes:**
- All environment variables must be prefixed with `VITE_` to be accessible in your code
- Access them using `import.meta.env.VITE_VARIABLE_NAME` or use the utility in `src/utils/env.js`
- The `.env` file is gitignored - never commit sensitive data
- For production, set these variables in your hosting platform (Vercel, Netlify, etc.)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
YoginiArts/
├── src/
│   ├── components/      # Reusable UI components
│   │   └── ui/         # Basic UI components (Button, Card, Input, etc.)
│   ├── pages/          # Page components
│   ├── locales/        # Translation files (en, zh)
│   ├── i18n/           # i18n configuration
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── public/             # Static assets
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── package.json        # Dependencies and scripts
```

## Purpose of the Front-End Experience

The Yogini Arts platform is designed to:

* Present sacred artworks with clarity, respect, and cultural depth
* Offer an immersive art-viewing and learning experience
* Help visitors understand the meaning behind each piece
* Support spiritual seekers in finding the right sacred item
* Strengthen brand identity through refined visual storytelling

## License

All rights reserved. © 2024 Yogini Arts
