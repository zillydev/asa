/**
 * Configuration Module
 */

const Pins = [
  {
    href: "https://instagram.com",
    icon: Icons.instagram,
  },
  {
    href: "https://x.com",
    icon: Icons.x,
  },
  {
    href: "https://github.com",
    icon: Icons.github,
  },
  {
    href: "https://calendar.google.com",
    icon: Icons.calendar,
  },
  {
    href: "https://meet.google.com",
    icon: Icons.video,
  },
]

const LinkProviders = (() => {
  const providers = [
    {
      id: "link",
      name: "Direct Link",
      match: (search) => {
        if (
          search.startsWith("//") ||
          (/[^\s][\.][^\s]/.test(search) && !search.includes(" "))
        ) {
          return search
        }
        return null
      },
      link: (search) => {
        // Strip existing protocol if present to avoid duplication
        const cleanSearch = search.replace(/^https?:\/\//, "//")
        return `https:${cleanSearch}`
      },
      icon: () => Icons.chrome,
    },
    {
      id: "github",
      name: "GitHub",
      prefix: "gh ",
      match(search) {
        return search.startsWith(this.prefix)
      },
      link: (search) => `http://github.com/${search.slice(3)}`,
      icon: () => Icons.github,
    },
    {
      id: "localhost",
      name: "Localhost",
      match: (search) => search.startsWith(":"),
      link: (search) => `http://localhost${search}`,
      icon: () => Icons.sitemap,
    },
    {
      id: "youtube",
      name: "YouTube",
      prefix: "yt ",
      match(search) {
        return search.startsWith(this.prefix)
      },
      link: (search) =>
        `https://www.youtube.com/results?search_query=${search.slice(3)}`,
      icon: () => Icons.youtube,
    },
    {
      id: "pin",
      name: "Pinned",
      match: (search) =>
        search.length === 1 && !Number.isNaN(+search) && +search > 0,
      link: (search) => {
        const id = document.getElementById.bind(document)
        return id("pin").children[+search - 1].href
      },
      icon: (search) => {
        const id = document.getElementById.bind(document)
        return id("pin").children[+search - 1].innerHTML
      },
    },
    {
      id: "ask",
      name: "Perplexity",
      prefix: "ask ",
      match(search) {
        return search.startsWith(this.prefix)
      },
      link: (search) =>
        `https://www.perplexity.ai/search/new?q=${search.slice(4)}`,
      icon: () => Icons.perplexity,
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      prefix: "gpt ",
      match(search) {
        return search.startsWith(this.prefix)
      },
      link: (search) => `https://chat.openai.com/?q=${search.slice(4)}`,
      icon: () => Icons.chatgpt,
    },
    {
      id: "claude",
      name: "Claude",
      prefix: "cl ",
      match(search) {
        return search.startsWith(this.prefix)
      },
      link: (search) => `https://claude.ai/new?q=${search.slice(3)}`,
      icon: () => Icons.claude,
    },
    {
      id: "background",
      name: "Switch Background",
      prefix: "bg ",
      match(search) {
        return search.startsWith(this.prefix)
      },
      link: (search) => {
        const id = search.slice(3).trim()
        Background.switchBackground(id)
        return "#" // Stay on the same page
      },
      icon: () => Icons.image,
      suggest: (query) => {
        const list = Background.getList()
        const currentId = Background.getCurrentId()
        const filtered = query
          ? list.filter(
              (v) =>
                v.id.toLowerCase().includes(query) ||
                v.name.toLowerCase().includes(query),
            )
          : list
        filtered.sort((a, b) => {
          if (a.id === currentId) return -1
          if (b.id === currentId) return 1
          return a.name.localeCompare(b.name)
        })
        return filtered.map((v) => {
          const isCurrent = v.id === currentId
          return {
            label: `${isCurrent ? "▶ " : ""}${v.name}`,
            href: `#bg-${v.id}`,
            isCurrent,
          }
        })
      },
    },
  ]

  return {
    /**
     * Get all providers
     */
    getAll: () => providers,

    /**
     * Get provider by ID
     */
    getById: (id) => providers.find((p) => p.id === id),

    /**
     * Get all command prefixes
     */
    getPrefixes: () => providers.filter((p) => p.prefix).map((p) => p.prefix),

    /**
     * Detect search mode based on search input
     */
    detect: (search, currentMode = null) => {
      if (currentMode != null) {
        const provider = providers.find((p) => p.id === currentMode)
        if (provider && !provider.match(search)) return null
      }

      const newProvider = providers.find((p) => p.match(search))
      return newProvider ? newProvider.id : null
    },
  }
})()
