import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Settings2, ExternalLink, Clock3, Newspaper, X, Menu } from 'lucide-react'

const PROXY = 'https://proxy.cors.dev/'
const categories = [
  { id: 'top', label: 'Top stories', feeds: [{ name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml' }] },
  { id: 'world', label: 'World', feeds: [{ name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' }] },
  { id: 'tech', label: 'Tech', feeds: [{ name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' }, { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' }] },
  { id: 'gaming', label: 'Gaming', keywords: /game|gaming|playstation|xbox|nintendo|steam|esports|video game|twitch|pokemon/i, feeds: [{ name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' }, { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' }] },
  { id: 'sports', label: 'Sports', feeds: [{ name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml' }] },
  { id: 'entertainment', label: 'Entertainment', feeds: [{ name: 'BBC Entertainment', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml' }] },
  { id: 'business', label: 'Business', feeds: [{ name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' }] },
]

function relativeTime(date) {
  if (!date) return 'Recently'
  const diff = Math.max(0, Date.now() - new Date(date).getTime())
  if (Number.isNaN(diff)) return 'Recently'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function parseFeed(xmlText, source) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error(`Couldn't read the ${source} news feed.`)
  const items = [...doc.querySelectorAll('item, entry')]
  return items.map((item) => {
    const text = (selector) => item.querySelector(selector)?.textContent?.trim() || ''
    const linkNode = item.querySelector('link')
    const link = linkNode?.getAttribute('href') || text('link')
    const media = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail')[0]
      || item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0]
    const image = media?.getAttribute('url') || item.querySelector('enclosure[url]')?.getAttribute('url') || ''
    const description = text('description') || text('summary') || text('content')
    const date = text('pubDate') || text('published') || text('updated')
    const title = text('title')
    return { title, url: link, description: description.replace(/<[^>]*>/g, '').trim(), publishedAt: date, image, source }
  }).filter(article => article.title && /^https?:\/\//i.test(article.url))
}

async function fetchFeed(feed) {
  const response = await fetch(PROXY + feed.url, { credentials: 'omit' })
  if (!response.ok) {
    const reason = response.headers.get('X-Cors-Error')
    throw new Error(`${feed.name}: ${reason || response.status}`)
  }
  return parseFeed(await response.text(), feed.name)
}

export default function App() {
  const [category, setCategory] = useState('top')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [mobileNav, setMobileNav] = useState(false)
  const activeCategory = useMemo(() => categories.find(c => c.id === category) || categories[0], [category])

  const loadNews = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const results = await Promise.allSettled(activeCategory.feeds.map(fetchFeed))
      const loaded = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
      const failed = results.filter(r => r.status === 'rejected')
      const unique = [...new Map(loaded.map(article => [article.url, article])).values()]
      const filtered = activeCategory.keywords ? unique.filter(article => activeCategory.keywords.test(`${article.title} ${article.description}`)) : unique
      const searched = query.trim() ? filtered.filter(article => `${article.title} ${article.description} ${article.source}`.toLowerCase().includes(query.trim().toLowerCase())) : filtered
      searched.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
      setArticles(searched.slice(0, 30))
      setUpdatedAt(new Date())
      if (!searched.length && failed.length) setError('Could not load news feeds. Please retry in a moment.')
      else if (!searched.length) setError(query ? 'No stories matched your search. Try another phrase.' : 'No stories are available in this section right now.')
      else if (failed.length) setError('Some sources could not be reached. Showing stories from the sources that loaded.')
    } catch {
      setArticles([])
      setError('Could not load news right now. Check your connection and retry.')
    } finally {
      setLoading(false)
    }
  }, [activeCategory, query])

  useEffect(() => { loadNews() }, [loadNews])

  const submitSearch = (event) => {
    event.preventDefault()
    setQuery(search.trim())
  }
  const chooseCategory = (id) => {
    setCategory(id)
    setQuery('')
    setSearch('')
    setMobileNav(false)
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); chooseCategory('top') }} aria-label="Signal home">
        <span className="brand-mark"><span /></span><span>SIGNAL</span>
      </a>
      <nav className={`nav-tabs ${mobileNav ? 'nav-open' : ''}`} aria-label="News categories">
        {categories.map(item => <button key={item.id} className={`nav-tab ${category === item.id && !query ? 'active' : ''}`} onClick={() => chooseCategory(item.id)}>{item.label}</button>)}
      </nav>
      <div className="top-actions">
        <button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNav(v => !v)}><Menu size={18}/></button>
        <button className="icon-button" aria-label="Refresh news" title="Refresh news" onClick={loadNews} disabled={loading}><RefreshCw size={18} className={loading ? 'spin' : ''}/></button>
      </div>
    </header>

    <main className="content">
      <section className="intro-row">
        <div>
          <div className="eyebrow"><span className="status-dot" /> YOUR DAILY BRIEFING</div>
          <h1>{query ? 'Search results' : activeCategory.label}<span className="period">.</span></h1>
          <p className="subhead">The stories worth your attention. Nothing extra.</p>
        </div>
        <div className="intro-meta">
          {updatedAt && <span><Clock3 size={14}/> Updated {relativeTime(updatedAt.toISOString())}</span>}
          <button className="refresh-button" onClick={loadNews} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/> Refresh</button>
        </div>
      </section>

      <form className="search-form" onSubmit={submitSearch}>
        <Search size={18} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search these headlines..." aria-label="Search news" />
        {search && <button type="button" className="clear-search" onClick={() => { setSearch(''); setQuery('') }} aria-label="Clear search"><X size={15}/></button>}
        <button className="search-submit" type="submit">Search</button>
      </form>

      {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={loadNews} disabled={loading}>Retry</button></div>}

      {loading ? <section className="news-grid" aria-label="Loading news">{Array.from({length: 6}).map((_, i) => <article className="news-card skeleton-card" key={i}><div className="skeleton-image"/><div className="card-body"><div className="skeleton-line wide"/><div className="skeleton-line"/><div className="skeleton-line short"/></div></article>)}</section>
      : articles.length > 0 ? <section className="news-grid" aria-label="News articles">
        {articles.map((article, i) => <article className={`news-card ${i === 0 && !query ? 'featured' : ''}`} key={article.url}>
          {article.image ? <a className="article-image" href={article.url} target="_blank" rel="noreferrer"><img src={article.image} alt="" loading="lazy" onError={e => { e.currentTarget.parentElement.style.display = 'none' }}/></a> : <div className="article-image image-placeholder"><Newspaper size={24}/></div>}
          <div className="card-body">
            <div className="article-meta"><span>{article.source || 'News source'}</span><span>{relativeTime(article.publishedAt)}</span></div>
            <h2><a href={article.url} target="_blank" rel="noreferrer">{article.title}</a></h2>
            {article.description && <p>{article.description}</p>}
            <a className="read-link" href={article.url} target="_blank" rel="noreferrer">Read story <ExternalLink size={13}/></a>
          </div>
        </article>)}
      </section> : !loading && <div className="empty-state">No stories to show.</div>}

      <footer className="footer"><span> SIGNAL <span className="footer-dot">/</span> NEWS, WITHOUT THE NOISE</span><span>Live headlines via public RSS feeds. Articles and images belong to their publishers.</span></footer>
    </main>
  </div>
}
