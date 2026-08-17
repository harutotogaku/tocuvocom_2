// Projects Data
let projects = [];
let archives = [];

const CMS_CONFIG = {
  serviceDomain: 'tocuvo',
  endpoint: 'works'
};

// Note: In production, pass this from a server or build-time env instead of hardcoding.
const CMS_API_KEY = window.__MICROCMS_API_KEY || 'po6QHt5InSCH2S1ZyxGu0s6L0SqvEKY8Cmuw';

// State
let currentFilter = 'all';
let currentView = 'list';
let selectedProjectId = null;
let selectedArchiveId = null;
let currentPage = 'works';

// DOM Elements
const worksPage = document.getElementById('works-page');
const aboutPage = document.getElementById('about-page');
const archivePage = document.getElementById('archive-page');
const projectsList = document.getElementById('projects-list');
const projectDetail = document.getElementById('project-detail');
const archiveList = document.getElementById('archive-list');
const archiveDetail = document.getElementById('archive-detail');
const aboutContent = document.getElementById('about-content');

let aboutData = null;

// Navigation
const navWorks = document.getElementById('nav-works');
const navArchive = document.getElementById('nav-archive');
const navAbout = document.getElementById('nav-about');

navWorks.addEventListener('click', (e) => {
  e.preventDefault();
  location.hash = '#/works';
});
navArchive.addEventListener('click', (e) => {
  e.preventDefault();
  location.hash = '#/archive';
});
navAbout.addEventListener('click', (e) => {
  e.preventDefault();
  location.hash = '#/about';
});

function switchPage(page) {
  currentPage = page;
  
  // Update nav
  if (page === 'works') {
    navWorks.classList.add('active');
    navArchive.classList.remove('active');
    navAbout.classList.remove('active');
    worksPage.classList.add('active');
    archivePage.classList.remove('active');
    aboutPage.classList.remove('active');
  } else if (page === 'archive') {
    navWorks.classList.remove('active');
    navArchive.classList.add('active');
    navAbout.classList.remove('active');
    worksPage.classList.remove('active');
    archivePage.classList.add('active');
    aboutPage.classList.remove('active');
  } else {
    navWorks.classList.remove('active');
    navArchive.classList.remove('active');
    navAbout.classList.add('active');
    aboutPage.classList.add('active');
    worksPage.classList.remove('active');
    archivePage.classList.remove('active');
  }
}

// Filter Tabs
const filterTabs = document.querySelectorAll('.filter-tab');
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const filter = tab.dataset.filter;
    currentFilter = filter;
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderProjects();
  });
});

// View Toggle
const viewListBtn = document.getElementById('view-list');
const viewGridBtn = document.getElementById('view-grid');

viewListBtn.addEventListener('click', () => {
  currentView = 'list';
  viewListBtn.classList.add('active');
  viewGridBtn.classList.remove('active');
  renderProjects();
});

viewGridBtn.addEventListener('click', () => {
  currentView = 'grid';
  viewGridBtn.classList.add('active');
  viewListBtn.classList.remove('active');
  renderProjects();
});

// Helpers
function getProjectCategoryLabel(project) {
  const raw = project.category2 ?? project.category;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') return raw.name || raw.id || '';
  return String(raw);
}

function normalizeCategoryValue(category) {
  if (!category) return '';
  if (typeof category === 'string') return category.trim().toLowerCase();
  if (typeof category === 'object') {
    return String(category.id ?? category.name ?? '').trim().toLowerCase();
  }
  return String(category).trim().toLowerCase();
}

function getProjectCategory1Values(project) {
  const raw = project.category1;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map(normalizeCategoryValue)
      .filter(Boolean);
  }

  const normalized = normalizeCategoryValue(raw);
  return normalized ? [normalized] : [];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getAssetUrl(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return getAssetUrl(value[0]);
  if (typeof value === 'object') return value.url || value.src || '';
  return '';
}

function getAboutTitle(data) {
  return data.title ?? data.name ?? data.heading ?? '';
}

function getAboutDescription(data) {
  return data.about ?? data.description ?? data.profile ?? data.body ?? data.caption ?? '';
}

function sanitizeRichText(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script, object, embed').forEach(node => node.remove());
  return template.innerHTML;
}

function getAboutImage(data) {
  return getAssetUrl(data.img ?? data.image ?? data.thumbnail ?? data.avatar ?? data.profileImage);
}

function getAboutLinks(data) {
  const linkCandidates = [
    ['Email', data.email ? `mailto:${data.email}` : ''],
    ['Instagram', data.instagram],
    ['X', data.x],
    ['Website', data.website],
    ['Portfolio', data.portfolio]
  ];

  return linkCandidates.filter(([, url]) => typeof url === 'string' && url.trim());
}

function renderAboutData(data) {
  if (!aboutContent) return;

  const title = getAboutTitle(data);
  const description = getAboutDescription(data);
  const imageUrl = getAboutImage(data);
  const links = getAboutLinks(data);
  const richText = typeof description === 'string' ? sanitizeRichText(description) : '';

  aboutContent.innerHTML = `
    <div class="about-text">
      ${title ? `<p class="about-heading">${escapeHtml(title)}</p>` : ''}
      ${richText ? `<div class="about-richtext">${richText}</div>` : '<p>プロフィール情報は準備中です。</p>'}
      ${links.length > 0 ? `
        <div class="about-contact">
          <p>Contact</p>
          <div class="contact-links">
            ${links.map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}: ${escapeHtml(url.replace('mailto:', ''))}</a>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    ${imageUrl ? `
      <div class="about-photo">
        <img src="${imageUrl}?w=900&fit=max&q=75" alt="${escapeHtml(title)}" />
      </div>
    ` : ''}
  `;
}

async function fetchAboutData() {
  if (!aboutContent) return;

  aboutContent.innerHTML = '<p class="about-loading">Loading profile...</p>';

  try {
    const response = await fetch(`https://${CMS_CONFIG.serviceDomain}.microcms.io/api/v1/about`, {
      headers: {
        'X-MICROCMS-API-KEY': CMS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`microCMS about request failed: ${response.status}`);
    }

    const data = await response.json();
    aboutData = Array.isArray(data.contents) ? data.contents[0] ?? null : data;

    if (!aboutData) {
      aboutContent.innerHTML = '<p class="about-loading">プロフィール情報はまだ登録されていません。</p>';
      return;
    }

    renderAboutData(aboutData);
  } catch (error) {
    console.error('Aboutデータの取得に失敗しました:', error);
    aboutContent.innerHTML = '<p class="about-loading">プロフィールデータの取得に失敗しました。</p>';
  }
}

function getProjectYear(project) {
  const raw = project.data ?? project.year ?? project.date;
  if (!raw) return '';
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (typeof raw === 'object') return raw.year ?? raw.name ?? raw.id ?? '';
  return String(raw);
}

function getArchiveTitle(archive) {
  return archive.archive_title ?? archive.title ?? '';
}

function getArchiveDate(archive) {
  const raw = archive.archive_data ?? archive.date ?? archive.data;
  if (!raw) return '';
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (typeof raw === 'object') return raw.year ?? raw.name ?? raw.id ?? '';
  return String(raw);
}

function getArchiveThumbUrl(archive) {
  return getAssetUrl(archive.archive_thumbnail ?? archive.thumbnail);
}

function getArchiveHeroUrl(archive) {
  const thumb = getArchiveThumbUrl(archive);
  const images = extractImageUrls(archive.archive_img);
  return images[0] || thumb || '';
}

function getArchiveSlug(archive) {
  return String(archive.slug || archive.id || '').trim();
}

function getProjectSlug(project) {
  return String(project.slug || project.id || '').trim();
}

function getDetailHash(slug) {
  return `#/works/${encodeURIComponent(slug)}`;
}

function getArchiveDetailHash(slug) {
  return `#/archive/${encodeURIComponent(slug)}`;
}

function getSlugFromHash() {
  const raw = location.hash.replace(/^#/, '').trim();
  return raw ? decodeURIComponent(raw) : '';
}

let lightboxEl = null;
let lightboxImgEl = null;
let lightboxItems = [];
let lightboxIndex = -1;

function updateLightboxNavigation() {
  if (!lightboxEl) return;
  const prevBtn = lightboxEl.querySelector('.image-lightbox-prev');
  const nextBtn = lightboxEl.querySelector('.image-lightbox-next');
  if (!prevBtn || !nextBtn) return;

  const hasMultiple = lightboxItems.length > 1;
  prevBtn.style.display = hasMultiple ? 'grid' : 'none';
  nextBtn.style.display = hasMultiple ? 'grid' : 'none';
}

function showLightboxImageByIndex(index) {
  if (!lightboxItems.length || !lightboxImgEl) return;

  const safeIndex = ((index % lightboxItems.length) + lightboxItems.length) % lightboxItems.length;
  lightboxIndex = safeIndex;
  const item = lightboxItems[safeIndex];
  lightboxImgEl.src = item.src;
  lightboxImgEl.alt = item.alt;
}

function openImageLightbox(index = 0) {
  if (!lightboxEl || !lightboxImgEl || !lightboxItems.length) return;
  showLightboxImageByIndex(index);
  updateLightboxNavigation();
  lightboxEl.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeImageLightbox() {
  if (!lightboxEl || !lightboxImgEl) return;
  lightboxEl.classList.remove('active');
  lightboxImgEl.src = '';
  lightboxImgEl.alt = '';
  lightboxIndex = -1;
  document.body.style.overflow = '';
}

function showNextLightboxImage() {
  if (!lightboxItems.length) return;
  showLightboxImageByIndex(lightboxIndex + 1);
}

function showPrevLightboxImage() {
  if (!lightboxItems.length) return;
  showLightboxImageByIndex(lightboxIndex - 1);
}

function collectLightboxItems() {
  lightboxItems = Array.from(document.querySelectorAll('.detail-image img')).map((img) => ({
    src: img.dataset.lightboxSrc || img.dataset.fullSrc || img.currentSrc || img.src,
    alt: img.alt || ''
  }));
}

function setupImageLightbox() {
  if (lightboxEl) return;

  lightboxEl = document.createElement('div');
  lightboxEl.className = 'image-lightbox';
  lightboxEl.setAttribute('aria-hidden', 'true');
  lightboxEl.innerHTML = `
    <button type="button" class="image-lightbox-nav image-lightbox-prev" aria-label="Previous image">‹</button>
    <button type="button" class="image-lightbox-nav image-lightbox-next" aria-label="Next image">›</button>
    <button type="button" class="image-lightbox-close" aria-label="Close image">×</button>
    <img class="image-lightbox-img" src="" alt="" />
  `;

  document.body.appendChild(lightboxEl);
  lightboxImgEl = lightboxEl.querySelector('.image-lightbox-img');

  document.addEventListener('click', (event) => {
    const targetImage = event.target.closest('.detail-image img');
    if (!targetImage) return;

    const imageNodes = Array.from(document.querySelectorAll('.detail-image img'));
    const index = imageNodes.indexOf(targetImage);
    if (index < 0) return;

    collectLightboxItems();
    openImageLightbox(index);
  });

  lightboxEl.addEventListener('click', (event) => {
    if (event.target.closest('.image-lightbox-prev')) {
      showPrevLightboxImage();
      return;
    }

    if (event.target.closest('.image-lightbox-next')) {
      showNextLightboxImage();
      return;
    }

    if (event.target === lightboxEl || event.target.closest('.image-lightbox-close')) {
      closeImageLightbox();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!lightboxEl.classList.contains('active')) return;

    if (event.key === 'Escape') {
      closeImageLightbox();
      return;
    }

    if (event.key === 'ArrowRight') {
      showNextLightboxImage();
      return;
    }

    if (event.key === 'ArrowLeft') {
      showPrevLightboxImage();
    }
  });
}

function getProjectThumbUrl(project) {
  return project.thumbnail?.url || '';
}

function getProjectHeroUrl(project) {
  return project.image?.url || project.thumbnail?.url || '';
}

function renderDetailBody(project) {
  const bodyEl = document.getElementById('detail-body');
  if (!bodyEl) return;

  let html = '';
  let imageHtml = '';
  let linkHtml = '';

  // 説明文（caption）
  if (project.caption && typeof project.caption === 'string' && project.caption.trim()) {
    html += `
      <section class="detail-caption-block">
        <p class="detail-caption-label">Caption</p>
        <div class="detail-caption"><p>${project.caption}</p></div>
      </section>
    `;
  }

  // サブ画像（image）- 複数の形式に対応
  const imageUrls = extractImageUrls(project.image);
  if (imageUrls.length > 0) {
    imageUrls.forEach((url, idx) => {
      const previewSrc = `${url}?w=1100&h=1500&fit=max&q=70`;
      const lightboxSrc = `${url}?w=1700&fit=max&q=65`;
      imageHtml += `<div class="detail-image"><img src="${previewSrc}" data-full-src="${url}" data-lightbox-src="${lightboxSrc}" alt="${project.title || 'Image'} ${idx + 1}" loading="lazy" /></div>`;
    });
  }

  // YouTube動画リンク
  if (project.videolink && typeof project.videolink === 'string' && project.videolink.trim()) {
    const videoId = extractYoutubeId(project.videolink);
    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}?modestbranding=1`;
      html += `<div class="detail-video"><iframe width="100%" height="400" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
  }

  // メイン本文（main_text）- リッチテキスト
  if (project.main_text && typeof project.main_text === 'string' && project.main_text.trim()) {
    const richMainText = sanitizeRichText(project.main_text);
    html += `<div class="detail-main-text">${richMainText}</div>`;
  }

  // ファイルリンク（fileLink）- リッチテキスト
  if (project.fileLink && typeof project.fileLink === 'string' && project.fileLink.trim()) {
    const richFileLink = sanitizeRichText(project.fileLink);
    html += `<div class="detail-file-link">${richFileLink}</div>`;
  }

  // 外部リンク（Award）
  if (project.award && typeof project.award === 'string' && project.award.trim()) {
    const awardLabel = (project.award_text && typeof project.award_text === 'string') ? project.award_text : 'Award';
    linkHtml += `<div class="detail-link"><a href="${project.award}" target="_blank" rel="noopener noreferrer">${awardLabel} →</a></div>`;
  }

  // 外部リンク（Exhibition）
  if (project.exhibition && typeof project.exhibition === 'string' && project.exhibition.trim()) {
    const exhibitionLabel = (project.exhibition_text && typeof project.exhibition_text === 'string') ? project.exhibition_text : 'Exhibition';
    linkHtml += `<div class="detail-link"><a href="${project.exhibition}" target="_blank" rel="noopener noreferrer">${exhibitionLabel} →</a></div>`;
  }

  if (linkHtml) {
    html += `<section class="detail-link-group">${linkHtml}</section>`;
  }

  // Special Thanks（spty）- リッチテキスト
  if (project.spty && typeof project.spty === 'string' && project.spty.trim()) {
    const richSpecialThanks = sanitizeRichText(project.spty);
    html += `<section class="detail-spty">${richSpecialThanks}</section>`;
  }

  if (imageHtml) {
    html += `<section class="detail-image-stack">${imageHtml}</section>`;
  }

  if (!html.trim()) {
    html = '<p>詳細情報は準備中です。</p>';
  }

  bodyEl.innerHTML = html;
  collectLightboxItems();
}

function extractImageUrls(imageField) {
  const urls = [];

  if (!imageField) return urls;

  // ケース1: 配列の場合
  if (Array.isArray(imageField)) {
    imageField.forEach(item => {
      const url = extractSingleImageUrl(item);
      if (url) urls.push(url);
    });
    return urls;
  }

  // ケース2: 単一オブジェクトまたは文字列
  const url = extractSingleImageUrl(imageField);
  if (url) urls.push(url);

  return urls;
}

function extractSingleImageUrl(item) {
  if (!item) return null;

  // 文字列の場合
  if (typeof item === 'string') {
    return item;
  }

  // オブジェクトの場合 - 複数のプロパティを試す
  if (typeof item === 'object') {
    return item.url || item.src || item.path || item.imageUrl || null;
  }

  return null;
}

function extractYoutubeId(url) {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Render Projects
function renderProjects() {
  const filteredProjects = projects.filter(p => {
    if (currentFilter === 'all') return true;
    const categoryValues = getProjectCategory1Values(p);
    return categoryValues.includes(currentFilter.toLowerCase());
  });

  projectsList.innerHTML = '';

  if (currentView === 'grid') {
    projectsList.className = 'projects-grid';
    filteredProjects.forEach((project, index) => {
      const thumbUrl = getProjectThumbUrl(project);
      const item = document.createElement('div');
      item.className = 'project-grid-item';
      item.style.animationDelay = `${index * 0.05}s`;
      item.innerHTML = `
        <div class="project-grid-thumb">
          ${thumbUrl ? `<img src="${thumbUrl}?w=800&fit=max&q=75" alt="${project.title}" loading="lazy" />` : '<div class="project-grid-thumb-empty"></div>'}
        </div>
        <div class="project-grid-info">
          <div class="project-title-wrapper">
            <h3 class="project-title">${project.title}</h3>
            <div class="project-strike"></div>
          </div>
          <div class="project-meta">
            <span class="project-category">${getProjectCategoryLabel(project)}</span>
            <span class="project-year">${getProjectYear(project)}</span>
          </div>
        </div>
      `;
      item.addEventListener('click', () => showProjectDetail(project));
      projectsList.appendChild(item);
    });
  } else {
    projectsList.className = 'projects-list';
    filteredProjects.forEach((project, index) => {
      const projectItem = document.createElement('div');
      projectItem.className = 'project-item';
      projectItem.style.animationDelay = `${index * 0.05}s`;
      const thumbUrl = getProjectThumbUrl(project);
      projectItem.innerHTML = `
        <div class="project-left">
          <div class="project-title-wrapper">
            <h3 class="project-title">${project.title}</h3>
            <div class="project-strike"></div>
          </div>
          <div class="project-meta">
            <span class="project-category">${getProjectCategoryLabel(project)}</span>
            <span class="project-year">${getProjectYear(project)}</span>
          </div>
        </div>
        <div class="project-preview">
          ${thumbUrl ? `<img src="${thumbUrl}" alt="${project.title}" />` : ''}
        </div>
      `;
      projectItem.addEventListener('click', () => showProjectDetail(project));
      projectsList.appendChild(projectItem);
    });
  }
}

function renderArchiveDetailBody(archive) {
  const bodyEl = document.getElementById('archive-detail-body');
  if (!bodyEl) return;

  let html = '';
  let imageHtml = '';

  if (archive.archive_text && typeof archive.archive_text === 'string' && archive.archive_text.trim()) {
    const richText = sanitizeRichText(archive.archive_text);
    html += `<div class="detail-main-text">${richText}</div>`;
  }

  const imageUrls = extractImageUrls(archive.archive_img);
  if (imageUrls.length > 0) {
    imageUrls.forEach((url, idx) => {
      const previewSrc = `${url}?w=1100&h=1500&fit=max&q=70`;
      const lightboxSrc = `${url}?w=1700&fit=max&q=65`;
      imageHtml += `<div class="detail-image"><img src="${previewSrc}" data-full-src="${url}" data-lightbox-src="${lightboxSrc}" alt="${getArchiveTitle(archive) || 'Archive'} ${idx + 1}" loading="lazy" /></div>`;
    });
  }

  if (imageHtml) {
    html += `<section class="detail-image-stack">${imageHtml}</section>`;
  }

  if (!html.trim()) {
    html = '<p>詳細情報は準備中です。</p>';
  }

  bodyEl.innerHTML = html;
  collectLightboxItems();
}

function showArchiveDetail(archive, updateHash = true) {
  selectedArchiveId = archive.id;

  const slug = getArchiveSlug(archive);
  if (updateHash && slug) {
    const nextHash = getArchiveDetailHash(slug);
    if (location.hash !== nextHash) {
      location.hash = nextHash;
    }
  }

  archiveList.style.display = 'none';
  archivePage.querySelector('.page-header').style.display = 'none';
  archiveDetail.classList.add('active');

  document.getElementById('archive-detail-date').textContent = getArchiveDate(archive);
  document.getElementById('archive-detail-title').textContent = getArchiveTitle(archive);
  document.getElementById('archive-detail-hero-img').src = getArchiveHeroUrl(archive);
  document.getElementById('archive-detail-hero-img').alt = getArchiveTitle(archive);
  renderArchiveDetailBody(archive);
}

function hideArchiveDetail(updateHash = true) {
  selectedArchiveId = null;

  if (updateHash && location.hash.startsWith('#/archive/')) {
    location.hash = '#/archive';
  }

  archiveList.style.display = '';
  archivePage.querySelector('.page-header').style.display = 'block';
  archiveDetail.classList.remove('active');
}

function renderArchives() {
  if (!archiveList) return;

  archiveList.innerHTML = '';

  archives.forEach((archive, index) => {
    const archiveItem = document.createElement('div');
    archiveItem.className = 'project-item';
    archiveItem.style.animationDelay = `${index * 0.05}s`;
    const thumbUrl = getArchiveThumbUrl(archive);
    const title = getArchiveTitle(archive);
    const date = getArchiveDate(archive);

    archiveItem.innerHTML = `
      <div class="project-left">
        <div class="project-title-wrapper">
          <h3 class="project-title">${escapeHtml(title)}</h3>
          <div class="project-strike"></div>
        </div>
        <div class="project-meta">
          <span class="project-category">Archive</span>
          <span class="project-year">${escapeHtml(date)}</span>
        </div>
      </div>
      <div class="project-preview">
        ${thumbUrl ? `<img src="${thumbUrl}?w=1000&fit=max&q=75" alt="${escapeHtml(title)}" />` : ''}
      </div>
    `;

    archiveItem.addEventListener('click', () => showArchiveDetail(archive));
    archiveList.appendChild(archiveItem);
  });

  if (!archives.length) {
    archiveList.innerHTML = '<p>アーカイブデータはまだありません。</p>';
  }
}

// Project Detail
function showProjectDetail(project, updateHash = true) {
  selectedProjectId = project.id;

  // URL ハッシュを #/works/slug に更新
  const slug = getProjectSlug(project);
  if (updateHash && slug) {
    const nextHash = getDetailHash(slug);
    if (location.hash !== nextHash) {
      location.hash = nextHash;
    }
  }

  // Hide projects list, show detail
  projectsList.style.display = 'none';
  document.querySelector('.filter-tabs').style.display = 'none';
  document.querySelector('.page-header').style.display = 'none';
  projectDetail.classList.add('active');
  
  // Populate detail
  const category1Raw = project.category1;
  const category1Label = typeof category1Raw === 'string' ? category1Raw : (category1Raw?.name || '');
  
  document.getElementById('detail-category1').textContent = category1Label;
  document.getElementById('detail-category2').textContent = getProjectCategoryLabel(project);
  document.getElementById('detail-year').textContent = getProjectYear(project);
  document.getElementById('detail-title').textContent = project.title;
  const subtitleEl = document.getElementById('detail-subtitle');
  const subtitleText = (project.subtitle ?? '').trim();
  subtitleEl.textContent = subtitleText;
  subtitleEl.style.display = subtitleText ? 'block' : 'none';
  document.getElementById('detail-hero-img').src = getProjectHeroUrl(project);
  document.getElementById('detail-hero-img').alt = project.title;
  renderDetailBody(project);
}

function hideProjectDetail(updateHash = true) {
  selectedProjectId = null;

  // URL ハッシュを works 一覧に戻す
  if (updateHash && location.hash.startsWith('#/works/')) {
    location.hash = '#/works';
  }

  // Show projects list, hide detail
  projectsList.style.display = '';
  document.querySelector('.filter-tabs').style.display = 'flex';
  document.querySelector('.page-header').style.display = 'block';
  projectDetail.classList.remove('active');
}

// ページと detail の hash 対応
function syncPageWithHash() {
  const hash = location.hash.replace(/^#/, '').trim();
  
  // ページレベルのルーティング
  if (hash.startsWith('/about')) {
    switchPage('about');
    hideProjectDetail(false);
    hideArchiveDetail(false);
  } else if (hash.startsWith('/archive')) {
    switchPage('archive');
    hideProjectDetail(false);
    syncArchiveDetailWithHash();
  } else {
    // /works または空の場合は works ページ
    switchPage('works');
    hideArchiveDetail(false);
    syncDetailWithHash();
  }
}

// 詳細ページの hash 対応（works detail）
function syncDetailWithHash() {
  const hash = location.hash.replace(/^#\/works\/?/, '').trim();
  const slug = hash ? decodeURIComponent(hash) : '';
  if (slug) {
    const project = projects.find(p => getProjectSlug(p) === slug);
    if (project) {
      showProjectDetail(project, false);
      return;
    }
  }
  hideProjectDetail(false);
}

function syncArchiveDetailWithHash() {
  const hash = location.hash.replace(/^#\/archive\/?/, '').trim();
  const slug = hash ? decodeURIComponent(hash) : '';
  if (slug) {
    const archive = archives.find(a => getArchiveSlug(a) === slug);
    if (archive) {
      showArchiveDetail(archive, false);
      return;
    }
  }
  hideArchiveDetail(false);
}

window.addEventListener('hashchange', syncPageWithHash);

// Back Button
document.getElementById('back-button').addEventListener('click', hideProjectDetail);
document.getElementById('back-button-bottom').addEventListener('click', hideProjectDetail);
document.getElementById('archive-back-button').addEventListener('click', hideArchiveDetail);
document.getElementById('archive-back-button-bottom').addEventListener('click', hideArchiveDetail);

// Initial Render
//renderProjects();
async function fetchWorksData() {
  projectsList.innerHTML = '<p>Loading works...</p>';

  try {
    const response = await fetch(`https://${CMS_CONFIG.serviceDomain}.microcms.io/api/v1/${CMS_CONFIG.endpoint}`, {
      headers: {
        'X-MICROCMS-API-KEY': CMS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`microCMS request failed: ${response.status}`);
    }

    const data = await response.json();

    projects = Array.isArray(data.contents) ? data.contents : [];
    renderProjects();

  } catch (error) {
    console.error("データの取得に失敗しました:", error);
    projectsList.innerHTML = '<p>作品データの取得に失敗しました。時間を置いて再読み込みしてください。</p>';
  }
}

async function fetchArchiveData() {
  if (!archiveList) return;

  archiveList.innerHTML = '<p>Loading archive...</p>';

  try {
    const response = await fetch(`https://${CMS_CONFIG.serviceDomain}.microcms.io/api/v1/archive`, {
      headers: {
        'X-MICROCMS-API-KEY': CMS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`microCMS archive request failed: ${response.status}`);
    }

    const data = await response.json();
    archives = Array.isArray(data.contents) ? data.contents : [];
    renderArchives();
  } catch (error) {
    console.error('Archiveデータの取得に失敗しました:', error);
    archiveList.innerHTML = '<p>アーカイブデータの取得に失敗しました。</p>';
  }
}

// 直打ちURLアクセス対応：# から始まるハッシュを解析して初期表示
async function initFromUrl() {
  await Promise.all([fetchWorksData(), fetchArchiveData()]);
  
  const hash = location.hash.replace(/^#/, '').trim();
  if (!hash || hash === '/works') {
    location.hash = '#/works';
  } else if (hash === '/about') {
    // keep as is
  } else if (hash === '/archive') {
    // keep as is
  } else if (hash.startsWith('/works/')) {
    // keep as is
  } else if (hash.startsWith('/archive/')) {
    // keep as is
  } else {
    // 旧形式（#slug）は works の詳細URLに正規化
    location.hash = getDetailHash(hash);
  }
  
  syncPageWithHash();
}

// ページを読み込んだ時に、この処理を実行する
setupImageLightbox();
initFromUrl();
fetchAboutData();
