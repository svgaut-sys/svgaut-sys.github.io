/* presets.js — default theme state + presets inspired by the example profiles. */

const DEFAULT_STATE = {
  meta: { themeName: 'My Theme' },
  colors: {
    pageBg: '#101014',
    surface: '#1b1b24',
    accent: '#8b5cf6',
    accent2: '#ec4899',
    text: '#f4f4f8',
    muted: '#9c9cae',
  },
  fonts: { heading: 'Poppins', body: 'Poppins' },
  shape: { radius: 16, glass: true, blur: 10, borderAlpha: 0.25 },
  background: { image: '', tint: '#000000', tintAlpha: 0, effect: 'none' },
  topbar: { enabled: true, logoText: '', accentLine: true, animateLine: true },
  profile: {
    titleText: '', titleSize: 4.5, titleEffect: 'gradient',
    followerLabel: '', hideAvatar: false, hideBadges: false,
    hideMemberSince: false, hideCardBg: false, centerLayout: true,
  },
  collection: { buttonText: '', tabLabel: '', styleControls: true },
  cards: {
    style: 'overlay', width: 260, height: 460,
    hoverLift: true, floatAnim: false, hideCreator: true, tagsOnHover: true,
  },
  extras: {
    status: { enabled: false, emoji: '🟢', text: '' },
    news: { enabled: false, title: 'Updates', items: [] },
    about: { enabled: false, title: 'About Me', body: '' },
    banner: { enabled: false, url: '' },
    gallery: { enabled: false, title: 'Friends', items: [] },
  },
  misc: { cursor: 'auto', scrollbar: true, selection: true, entrance: true, hideEditButton: false },
};

const PRESETS = {
  'Poolcore Glass': {
    // Inspired by the GeleeFish aquarium theme
    colors: { pageBg: '#01579b', surface: '#0277bd', accent: '#00d9ff', accent2: '#ff6ec7', text: '#e0f7fa', muted: '#a5d8e6' },
    fonts: { heading: 'Pacifico', body: 'Poppins' },
    shape: { radius: 20, glass: true, blur: 12, borderAlpha: 0.3 },
    background: { image: '', tint: '#01579b', tintAlpha: 0.35, effect: 'bubbles' },
    topbar: { enabled: true, logoText: 'Dive into the sea ~', accentLine: true, animateLine: true },
    profile: { titleText: '', titleSize: 5, titleEffect: 'float', followerLabel: 'Aquarium Visitors', hideAvatar: true, hideBadges: true, hideMemberSince: true, centerLayout: true },
    collection: { buttonText: 'Aquarium Collection', styleControls: true },
    cards: { style: 'overlay', width: 260, height: 480, hoverLift: true, floatAnim: true, hideCreator: true, tagsOnHover: true },
    misc: { cursor: 'auto', scrollbar: true, selection: true, entrance: true, hideEditButton: false },
  },
  'Retro Terminal': {
    // Inspired by the ShinyHero pixel theme
    colors: { pageBg: '#0b0b0b', surface: '#141414', accent: '#609ad7', accent2: '#ff674d', text: '#ffffff', muted: '#d4c4a0' },
    fonts: { heading: 'VT323', body: 'VT323' },
    shape: { radius: 0, glass: false, blur: 0, borderAlpha: 0 },
    background: { image: '', tint: '#000000', tintAlpha: 0, effect: 'scanlines' },
    topbar: { enabled: true, logoText: 'START A CAMPAIGN', accentLine: true, animateLine: true },
    profile: { titleText: '', titleSize: 6, titleEffect: 'glitch', followerLabel: 'WANDERING KNIGHTS', hideAvatar: true, hideBadges: true, hideMemberSince: true, centerLayout: true },
    collection: { buttonText: 'THE ARCHIVE', styleControls: true },
    cards: { style: 'overlay', width: 300, height: 420, hoverLift: true, floatAnim: false, hideCreator: true, tagsOnHover: true },
    misc: { cursor: 'crosshair', scrollbar: true, selection: true, entrance: true, hideEditButton: false },
  },
  'Neon Glitch': {
    // Inspired by the JFZ glitch theme
    colors: { pageBg: '#000000', surface: '#0d0d0d', accent: '#ffff00', accent2: '#e100ff', text: '#ffffff', muted: '#999999' },
    fonts: { heading: 'Rubik Glitch', body: 'DM Sans' },
    shape: { radius: 4, glass: false, blur: 0, borderAlpha: 0.15 },
    background: { image: '', tint: '#000000', tintAlpha: 0, effect: 'none' },
    topbar: { enabled: true, logoText: 'JANITOR + BETA', accentLine: true, animateLine: true },
    profile: { titleText: '', titleSize: 5, titleEffect: 'glitch', followerLabel: 'SUBSCRIBERS', hideAvatar: false, hideBadges: false, hideMemberSince: true, centerLayout: true },
    collection: { buttonText: 'FILE ARCHIVE', styleControls: true },
    cards: { style: 'overlay', width: 260, height: 460, hoverLift: true, floatAnim: false, hideCreator: true, tagsOnHover: true },
    misc: { cursor: 'crosshair', scrollbar: true, selection: true, entrance: true, hideEditButton: false },
  },
  'Midnight Velvet': {
    colors: { pageBg: '#12071f', surface: '#241338', accent: '#c084fc', accent2: '#f0abfc', text: '#f5edff', muted: '#b1a0c9' },
    fonts: { heading: 'Cinzel', body: 'Crimson Text' },
    shape: { radius: 12, glass: true, blur: 14, borderAlpha: 0.2 },
    background: { image: '', tint: '#12071f', tintAlpha: 0.3, effect: 'stars' },
    topbar: { enabled: true, logoText: '', accentLine: true, animateLine: false },
    profile: { titleText: '', titleSize: 4.5, titleEffect: 'gradient', followerLabel: '', hideAvatar: false, hideBadges: false, hideMemberSince: false, centerLayout: true },
    collection: { buttonText: '', styleControls: true },
    cards: { style: 'overlay', width: 260, height: 460, hoverLift: true, floatAnim: false, hideCreator: true, tagsOnHover: true },
    misc: { cursor: 'auto', scrollbar: true, selection: true, entrance: true, hideEditButton: false },
  },
  'Clean Slate': {
    colors: { pageBg: '#101014', surface: '#1b1b24', accent: '#8b5cf6', accent2: '#ec4899', text: '#f4f4f8', muted: '#9c9cae' },
    fonts: { heading: 'DM Sans', body: 'DM Sans' },
    shape: { radius: 12, glass: false, blur: 0, borderAlpha: 0.12 },
    background: { image: '', tint: '#000000', tintAlpha: 0, effect: 'none' },
    topbar: { enabled: true, logoText: '', accentLine: false, animateLine: false },
    profile: { titleText: '', titleSize: 4, titleEffect: 'none', followerLabel: '', hideAvatar: false, hideBadges: false, hideMemberSince: false, centerLayout: false },
    collection: { buttonText: '', styleControls: true },
    cards: { style: 'default', width: 260, height: 460, hoverLift: true, floatAnim: false, hideCreator: false, tagsOnHover: false },
    misc: { cursor: 'auto', scrollbar: false, selection: true, entrance: false, hideEditButton: false },
  },
};
