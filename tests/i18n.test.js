function runI18nTests() {
  const i18n = window.halalI18n;
  const root = document.documentElement;
  const select = document.querySelector('#language-select');
  const coordinates = () => ({
    direction: root.dir,
    shellDirection: getComputedStyle(document.querySelector('.app-shell')).direction,
    sidebarX: document.querySelector('.sidebar').getBoundingClientRect().x,
    mainX: document.querySelector('.main-content').getBoundingClientRect().x,
    cards: [...document.querySelectorAll('.stat-card')].map((card) => Math.round(card.getBoundingClientRect().x))
  });
  select.value = 'en';
  select.dispatchEvent(new Event('change'));
  const english = coordinates();
  select.value = 'ur';
  select.dispatchEvent(new Event('change'));
  const urdu = coordinates();
  if (english.direction !== 'ltr' || urdu.direction !== 'ltr' || english.shellDirection !== 'ltr' || urdu.shellDirection !== 'ltr') throw new Error('Application shell direction changed');
  if (JSON.stringify(english.cards) !== JSON.stringify(urdu.cards) || english.sidebarX !== urdu.sidebarX || english.mainX !== urdu.mainX) throw new Error('Layout changed when language changed');
  const baseline = window.halalAnalyzer.analyze(['pork'], { language: 'en' }).classification;
  i18n.supported.forEach((language) => {
    if (window.halalAnalyzer.analyze(['pork'], { language }).classification !== baseline) throw new Error(`Halal result changed in ${language}`);
  });
  return 'i18n layout and policy invariance tests passed';
}
