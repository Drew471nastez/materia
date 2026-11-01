/* Announcement Bar Pro 2 (announcement-bar; Announcements, round 5): shared
   sweep of every section and block control live and by redraw, the slides
   (arrows, keys, autoplay paused on hover, off screen, in the builder and
   under reduced motion), the marquee, the countdowns (one tick a second, per
   instance, paused off screen, ended text, after a redraw), the close button,
   and custom colours and fonts under the theme priority. */
const {run, IMG, IMG2, FONT} = require('./theme-r5-announcements-lib.cjs');
run({
  name: 'announcement-bar', bgSel: '.ab2', text: '.ab2__msg', noRectWithin: '.ab2__marquee',
  blockTypes: ['announcement'], addType: 'announcement',
  baseSettings: {homepage_only: false},
  baseBlocks: [{type: 'announcement', settings: {text: 'First words'}}, {type: 'announcement', settings: {text: 'Second words', countdown_deadline: '01-01-2001 00:00', ended_text: 'Ended'}}],
  /* the countdown digits are the controller's (the Liquid cannot know the time); first paint is compared without one */
  firstPaintBlocks: [{type: 'announcement', settings: {text: 'First words'}}, {type: 'announcement', settings: {text: 'Second words'}}],
  values: {'announcement.countdown_deadline': '02-02-2002 10:00'},
  async extra() { return 0; },
}).catch(e => { console.error(e); process.exit(1); });
