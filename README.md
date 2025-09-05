# 🔗 Mediaeater Digest - Lightweight Link Blog

A fast, minimalist link curation tool built with React and Vite. Perfect for collecting, organizing, and sharing interesting links with smart tagging and interest graph features.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)
![Vite](https://img.shields.io/badge/Vite-4.5-646cff.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-3.3-38bdf8.svg)

## ✨ Features

### 🚀 Quick Link Addition
- **Paste & Go**: Just paste URLs - metadata is fetched automatically
- **Bulk Import**: Paste multiple URLs at once (one per line)
- **Smart Auto-Tagging**: Intelligent tag suggestions based on URL content
- **Keyboard Shortcut**: `Cmd/Ctrl+V` to instantly focus the paste area

### 🏷️ Tag-Based Interest Graph
- **Click-to-Filter**: Click any tag to filter links instantly
- **Multi-Tag Filtering**: Combine multiple tags for precise filtering
- **Tag Cloud**: Visual representation of popular topics
- **Related Links**: Discover connections through shared tags
- **Tag Frequency**: See which topics dominate your collection

### ⌨️ Power User Features
- **Keyboard Navigation**:
  - `J/K` - Navigate through links
  - `Enter` - Open selected link
  - `Cmd/Ctrl+K` - Quick search
  - `Cmd/Ctrl+L` - Toggle dark/light mode
- **Advanced Search**: Search across titles, descriptions, URLs, and tags
- **Smart Sorting**: By date, alphabetical, tag relevance, or popularity
- **Export/Import**: Backup and restore your link collection as JSON

### 🎨 Modern UI/UX
- **Dark/Light Mode**: Automatic system preference detection
- **Responsive Design**: Works perfectly on all devices
- **Rich Previews**: Favicons and metadata for each link
- **Smooth Animations**: Polished interactions throughout
- **Visit Tracking**: See which links are most popular (admin only)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/Mediaeater/link-blog.git
cd link-blog

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see your link blog!

## 📖 Usage

### Public View
Visit the site normally to browse all curated links. Users can:
- View all links with tags and timestamps
- Click tags to filter content
- Search for specific topics
- Open links in new tabs

### Admin Mode
Add `?admin=Mediaeater` to the URL for full content management:

```
http://localhost:5173/?admin=Mediaeater
```

Admin features include:
- **Add Links**: Quick paste box with auto-metadata
- **Edit Links**: Modify titles, descriptions, and tags
- **Delete Links**: Remove unwanted content
- **Pin Links**: Highlight important content at the top
- **Bulk Operations**: Import/export entire collections

## 🛠️ Configuration

### Change Admin Password
Edit the admin parameter in `src/components/LinkBlog.jsx`:

```javascript
const ADMIN_USER = 'YourSecretPassword';
```

### Customize Theme
Modify Tailwind configuration in `tailwind.config.js` to match your brand.

### Data Storage
Links are stored in two places:
1. **localStorage**: Primary storage for quick access
2. **JSON file**: `public/data/links.json` for backup/sharing

## 📦 Build & Deploy

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy Options

#### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

#### Netlify
1. Build the project: `npm run build`
2. Drag the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)

#### GitHub Pages
```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"

# Deploy
npm run deploy
```

## 🎯 Use Cases

- **Personal Bookmarking**: Replace traditional bookmarks with a searchable, tagged collection
- **Team Knowledge Base**: Share interesting articles and resources with your team
- **Content Curation**: Build topic-specific link collections for your audience
- **Research Organization**: Organize research materials with powerful tagging
- **Newsletter Prep**: Collect and organize links for newsletter content

## 🔧 Tech Stack

- **Frontend**: React 18 with Hooks
- **Build Tool**: Vite for lightning-fast development
- **Styling**: Tailwind CSS for utility-first design
- **Icons**: Lucide React for beautiful, consistent icons
- **Storage**: localStorage with JSON backup

## 📝 Project Structure

```
link-blog/
├── src/
│   ├── components/
│   │   ├── LinkBlog.jsx      # Main component
│   │   └── ui/               # Reusable UI components
│   ├── utils/
│   │   ├── storage.js        # Storage utilities
│   │   └── tagSuggestions.js # Smart tagging engine
│   └── main.jsx              # App entry point
├── public/
│   └── data/
│       └── links.json        # Link data storage
└── package.json              # Dependencies
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)

## 💡 Roadmap

- [ ] RSS feed generation
- [ ] Social sharing buttons
- [ ] Browser extension for quick adding
- [ ] Multiple user support
- [ ] Categories/Collections
- [ ] Archive functionality
- [ ] Analytics dashboard
- [ ] API for programmatic access

---

Made with ❤️ by [Mediaeater](https://github.com/Mediaeater)