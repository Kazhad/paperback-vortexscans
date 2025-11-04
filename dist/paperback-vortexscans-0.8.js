"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VortexScansInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const BASE = 'https://vortexscans.org';
exports.VortexScansInfo = {
    version: '1.0.0',
    name: 'VortexScans',
    description: 'Extension pour Paperback 0.8 pour récupérer séries et chapitres depuis vortexscans.org',
    author: 'generated-by-assistant',
    authorWebsite: 'https://github.com',
    icon: 'https://vortexscans.org/favicon.ico',
    contentRating: paperback_extensions_common_1.ContentRating.MATURE,
    websiteBaseURL: BASE,
    sourceTags: [{ text: 'Scanlation', type: paperback_extensions_common_1.TagType.GREY }],
    language: paperback_extensions_common_1.LanguageCode.ENGLISH,
};
class VortexScans extends paperback_extensions_common_1.Source {
    constructor(config) {
        super(config);
    }
    // Utility to create request headers used by the site
    buildRequest(url, method = 'GET') {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': BASE,
        };
        return createRequestObject({ url, method, headers });
    }
    async getMangaDetails(mangaId) {
        const request = this.buildRequest(`${BASE}/series/${mangaId}`);
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        // NOTE: selectors below are best-effort and may need tweaking if the site layout changes.
        const title = $('h1.series-title').first().text().trim() || $('meta[property="og:title"]').attr('content') || mangaId;
        const image = $('.series-cover img').attr('data-src') || $('.series-cover img').attr('src') || '';
        const desc = $('.series-description').text().trim() || $('.entry-content').text().trim() || '';
        const tags = [];
        $('.series-info .genres a').each((i, el) => {
            const t = $(el).text().trim();
            if (t)
                tags.push({ id: t, label: t });
        });
        const statusText = $('.series-info .status').text().toLowerCase();
        let status = paperback_extensions_common_1.MangaStatus.ONGOING;
        if (statusText.includes('completed'))
            status = paperback_extensions_common_1.MangaStatus.COMPLETED;
        if (statusText.includes('hiatus') || statusText.includes('cancel'))
            status = paperback_extensions_common_1.MangaStatus.ONGOING;
        return createManga({
            id: mangaId,
            titles: [title],
            image: image,
            tags,
            status,
            desc
        });
    }
    async getChapters(mangaId) {
        const request = this.buildRequest(`${BASE}/series/${mangaId}`);
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const chapters = [];
        // Common pattern: chapters listed under a chapter list container. Adjust selector if needed.
        $('.chapter-list li, .chapters li, .chapter-row').each((i, el) => {
            var _a;
            const el$ = $(el);
            const title = el$.find('a').text().trim();
            const chapterUrl = (_a = el$.find('a').attr('href')) !== null && _a !== void 0 ? _a : '';
            const chapId = chapterUrl.replace(BASE + '/read/', '').replace(/\/$/, '');
            const chapNumberMatch = title.match(/\d+(?:\.\d+)?/);
            const chapNumber = chapNumberMatch ? Number(chapNumberMatch[0]) : i + 1;
            const date = el$.find('.date, .chapter-date').text().trim();
            chapters.push(createChapter({
                id: chapId,
                mangaId,
                name: (0, paperback_extensions_common_1.decodeHTMLEntities)(title),
                langCode: paperback_extensions_common_1.LanguageCode.ENGLISH,
                chapNum: chapNumber,
                time: date ? new Date(date).getTime() : 0
            }));
        });
        // Chapters should be returned newest -> oldest
        return chapters.sort((a, b) => { var _a, _b; return ((_a = b === null || b === void 0 ? void 0 : b.chapNum) !== null && _a !== void 0 ? _a : 0) - ((_b = a === null || a === void 0 ? void 0 : a.chapNum) !== null && _b !== void 0 ? _b : 0); });
    }
    async getChapterDetails(mangaId, chapterId) {
        // The chapterId is expected to be the path segment after /read/ -- if you used a different id scheme adjust above
        const request = this.buildRequest(`${BASE}/read/${chapterId}`);
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const pages = [];
        // Vortex likely uses <img> tags inside a reader container. Adjust '.reader img' selector if site differs.
        $('.reader img, .chapter-content img').each((i, el) => {
            const src = $(el).attr('data-src') || $(el).attr('src');
            if (src)
                pages.push(src.startsWith('http') ? src : `${BASE}${src}`);
        });
        const name = $('title').text().trim() || `Chapter ${chapterId}`;
        return createChapterDetails({
            id: chapterId,
            mangaId,
            pages,
            longStrip: false,
            name
        });
    }
    async getSearchResults(query, metadata) {
        var _a;
        const search = encodeURIComponent((_a = query.title) !== null && _a !== void 0 ? _a : '');
        const request = this.buildRequest(`${BASE}/?s=${search}`);
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const tiles = [];
        // Adjust selector to match search results / series cards
        $('.series-card, .post, .result-item').each((i, el) => {
            const el$ = $(el);
            const link = el$.find('a').attr('href') || '';
            const id = link.replace(BASE + '/series/', '').replace(/\/$/, '');
            const title = el$.find('.title, h3, h2').text().trim() || id;
            const image = el$.find('img').attr('data-src') || el$.find('img').attr('src') || '';
            tiles.push(createMangaTile({
                id,
                title: createIconText({ text: (0, paperback_extensions_common_1.decodeHTMLEntities)(title) }),
                image: image.startsWith('http') ? image : `${BASE}${image}`
            }));
        });
        return createPagedResults({ results: tiles });
    }
    async getHomePageSections(sectionCallback) {
        // Example homepage: trending / latest updates
        const request = this.buildRequest(BASE);
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const latestSection = createHomeSection({ id: 'latest_updates', title: 'Latest', view_more: true });
        $('.latest-series .series-card, .recent .series-card').each((i, el) => {
            const el$ = $(el);
            const link = el$.find('a').attr('href') || '';
            const id = link.replace(BASE + '/series/', '').replace(/\/$/, '');
            const title = el$.find('.title').text().trim() || id;
            const image = el$.find('img').attr('data-src') || el$.find('img').attr('src') || '';
            latestSection.items.push(createMangaTile({
                id,
                title: createIconText({ text: (0, paperback_extensions_common_1.decodeHTMLEntities)(title) }),
                image: image.startsWith('http') ? image : `${BASE}${image}`
            }));
        });
        sectionCallback(latestSection);
    }
    async getViewMoreItems(homepageSectionId, metadata) {
        var _a;
        // Implement view-more (pagination) for sections if site supports it
        // Example: /series?page=2
        const page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
        const request = this.buildRequest(`${BASE}/series?page=${page}`);
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const tiles = [];
        $('.series-card, .post').each((i, el) => {
            const el$ = $(el);
            const link = el$.find('a').attr('href') || '';
            const id = link.replace(BASE + '/series/', '').replace(/\/$/, '');
            const title = el$.find('.title').text().trim() || id;
            const image = el$.find('img').attr('data-src') || el$.find('img').attr('src') || '';
            tiles.push(createMangaTile({
                id,
                title: createIconText({ text: (0, paperback_extensions_common_1.decodeHTMLEntities)(title) }),
                image: image.startsWith('http') ? image : `${BASE}${image}`
            }));
        });
        return createPagedResults({ results: tiles, metadata: { page: page + 1 } });
    }
    // Optional: implement filters / tag list
    async getTags() {
        // If the site exposes a /genres or /tags page, parse it and return tags
        const request = this.buildRequest(`${BASE}/genres`);
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const outTags = [];
        $('.genre-list a, .tags a').each((i, el) => {
            const t = $(el).text().trim();
            if (t)
                outTags.push({ id: t, label: t });
        });
        return [createTagSection({ id: '0', label: 'genres', tags: outTags })];
    }
}
exports.default = VortexScans;
/*
  INSTALL / TEST
  1) Build this file into a single extension .js following Paperback 0.8 extension packaging (see TheNetsky/extensions-generic-0.8 for examples).
  2) Add the hosted repo to your Paperback app (use a GitHub Pages index or host this single file).
  3) Load the extension in Paperback and test: search for a known series on vortexscans.org and open chapters.

  NOTES / TODO
  - Selectors are best-effort. If some functions return empty results, open the site in a browser, inspect the DOM, and update selectors like '.series-title', '.series-cover', '.chapter-list', '.reader img' accordingly.
  - Some pages lazy-load images with JavaScript; in that case images may be in data-src or in inline JSON. You may need to parse a <script> tag to extract page image URLs.
  - Respect the site's robots/DMCA. This extension is for personal use to read content you have rights to.

  SOURCES & REFERENCES
  - Paperback extension examples: TheNetsky/extensions-generic-0.8 and Netsky's extension index.
  - Target site: https://vortexscans.org (used to derive base URLs and path patterns)
*/
