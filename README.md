# Signal News

A simple, dark news reader built with React and Vite. **Live news is already connected** using public RSS feeds from BBC News, accessed through the free CORS proxy at `https://proxy.cors.dev/`. No API key, account, or manual setup is required.

## Run locally
1. Install Node.js LTS.
2. In this folder run `npm install`.
3. Run `npm run dev`.
4. Open the local URL Vite prints.

## Sections
- Top stories, World, Tech, Gaming, Sports, Entertainment, Business
- Headline search within the current section
- Refresh, loading skeletons, retryable errors, responsive article cards
- Each story links to the publisher's original article

## How live news works
The app fetches public publisher RSS feeds through a no-key CORS proxy and parses them in the browser. RSS availability and the proxy are third-party services, so a source can occasionally fail; the app shows a retryable message. Gaming filters gaming-related headlines from technology sources, so coverage depends on the feed's current stories.

## Important notes
- This is a lightweight student project. A free proxy is convenient but is not an uptime guarantee.
- The site displays headlines/snippets and links readers to the publishers. Article images and content belong to their respective publishers.
