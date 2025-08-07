# SenseGuardian Deployment Guide

## 🚀 Deploy to GitHub Pages

1. **Update package.json** with your repository homepage:

```json
"homepage": "https://meemmac.github.io/SenseGuardian"
```

2. **Install gh-pages**:

```bash
npm install --save-dev gh-pages
```

3. **Add deployment scripts** to package.json:

```json
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build"
}
```

4. **Deploy**:

```bash
npm run deploy
```

## 🌐 Deploy to Netlify

1. **Build the project**:

```bash
npm run build
```

2. **Drag and drop** the `build` folder to Netlify
3. **Your app is live!**

## 📱 Mobile Access

Once deployed, your app will be accessible at:

- GitHub Pages: `https://meemmac.github.io/SenseGuardian`
- Netlify: `https://your-app-name.netlify.app`

Users can then install it as a mobile app by adding it to their home screen!
