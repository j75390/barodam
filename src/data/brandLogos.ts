// Original brand logo designs: one icon + English wordmark + color + type style per brand.
/* eslint-disable */
export const BRAND_ICONS: Record<string, string> ={
 mountain:'<path d="M2 20 9 7l4 7 3-4 6 10z"/><path d="M9 7l2 3.5 2-1.5" fill="none" stroke="var(--lg-bg)" stroke-width="1.4"/>',
 leaf:'<path d="M20 4C9 4 4 9 4 16c0 2 .5 3 1 4 1-6 5-10 11-12-5 3-8 7-9 12 9 0 13-7 13-16z"/>',
 sun:'<circle cx="12" cy="12" r="4.5"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></g>',
 foot:'<path d="M3 15c0-3 2-5 5-5l3 1 3-4 4 2 3 3v4c0 2-1 3-3 3H5c-1.2 0-2-.8-2-2z"/><path d="M3 17h18" stroke="var(--lg-bg)" stroke-width="1.5"/>',
 wheat:'<path d="M12 22V8" stroke="currentColor" stroke-width="1.8"/><g><ellipse cx="9" cy="9" rx="2" ry="3.5" transform="rotate(-30 9 9)"/><ellipse cx="15" cy="9" rx="2" ry="3.5" transform="rotate(30 15 9)"/><ellipse cx="9" cy="14" rx="2" ry="3.5" transform="rotate(-30 9 14)"/><ellipse cx="15" cy="14" rx="2" ry="3.5" transform="rotate(30 15 14)"/><ellipse cx="12" cy="4.5" rx="1.8" ry="3"/></g>',
 bolt:'<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
 diamond:'<path d="M12 2 21 12 12 22 3 12z"/><path d="M12 6 17 12 12 18 7 12z" fill="var(--lg-bg)"/>',
 lines:'<rect x="3" y="5" width="18" height="2.6" rx="1.3"/><rect x="3" y="10.7" width="13" height="2.6" rx="1.3"/><rect x="3" y="16.4" width="8" height="2.6" rx="1.3"/>',
 drop:'<path d="M12 2s7 7.5 7 12.5A7 7 0 0 1 5 14.5C5 9.5 12 2 12 2z"/><path d="M9 15a3 3 0 0 0 3 3" fill="none" stroke="var(--lg-bg)" stroke-width="1.6" stroke-linecap="round"/>',
 mono:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4" fill="var(--lg-bg)"/>',
 barn:'<path d="M3 11 12 4l9 7v9H3z"/><rect x="9.5" y="13" width="5" height="7" fill="var(--lg-bg)"/>',
 window:'<rect x="4" y="3" width="16" height="18" rx="8"/><path d="M12 3v18M4 12h16" stroke="var(--lg-bg)" stroke-width="1.6"/>',
 circle:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5" fill="var(--lg-bg)"/>',
 wave:'<g stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/></g>',
 pin:'<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.6" fill="var(--lg-bg)"/>',
 bowl:'<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M9 4c1 1.5-1 2.5 0 4M13 4c1 1.5-1 2.5 0 4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
 steps:'<path d="M3 20h6v-5h5v-5h5V4h2v18H3z"/>',
 trail:'<path d="M4 21c4-5 0-8 5-11s6-6 11-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1 4.5"/><circle cx="20" cy="3.5" r="2.2"/>',
 phones:'<path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="3" y="13" width="5" height="8" rx="2"/><rect x="16" y="13" width="5" height="8" rx="2"/>',
 bean:'<ellipse cx="12" cy="12" rx="6.5" ry="9" transform="rotate(25 12 12)"/><path d="M9 4.5c3 4-1 10 3 15" stroke="var(--lg-bg)" stroke-width="1.6" fill="none"/>',
 cloud:'<path d="M7 19a5 5 0 0 1-.6-10A6 6 0 0 1 18 8.5 4.5 4.5 0 0 1 17.5 19z"/>',
 cursor:'<path d="M5 3l14 7-6 2-2 6z"/>',
 pot:'<rect x="4" y="9" width="16" height="10" rx="3"/><rect x="2" y="9" width="20" height="2.4" rx="1.2"/><path d="M10 6h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
 key:'<rect x="3" y="4" width="18" height="16" rx="3.5"/><rect x="6" y="7" width="12" height="8" rx="2" fill="var(--lg-bg)"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" stroke="var(--lg-bg)" stroke-width="2" fill="none" stroke-linecap="round"/>',
 puff:'<path d="M4 9c0-3 2-4 4-4 1 0 2 .5 4 .5S15 5 16 5c2 0 4 1 4 4v6c0 3-2 4-4 4-1 0-2-.5-4-.5S9 19 8 19c-2 0-4-1-4-4z"/>',
 pulse:'<path d="M2 12h5l2-5 4 11 3-8 2 2h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
 sunrise:'<path d="M5 17a7 7 0 0 1 14 0z"/><rect x="2" y="18.5" width="20" height="2.2" rx="1.1"/><path d="M12 3v3M4.5 8.5l2 2M19.5 8.5l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
 tent:'<path d="M12 3 2 21h20z"/><path d="M12 11l-3.5 10h7z" fill="var(--lg-bg)"/>',
 flame:'<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z"/>',
 steak:'<path d="M4 13c0-5 4-9 9-9 4 0 7 3 7 6 0 6-6 10-11 10-3 0-5-3-5-7z"/><circle cx="14" cy="10" r="2.4" fill="var(--lg-bg)"/>',
 vase:'<path d="M9 3h6v3c3 2 4 5 4 8a7 7 0 0 1-14 0c0-3 1-6 4-8z"/><path d="M7 13h10" stroke="var(--lg-bg)" stroke-width="1.6"/>'}
/** brand → [wordmark, icon, color, font style] */
export const BRAND_LOGOS: Record<string, [string, string, string, string]> ={
 '노스폴드':['NORTHFOLD','mountain','#1F3A5F','w'],'베이직무드':['basic mood','circle','#3A3A3A','r'],'모노픽':['MONOPICK','mono','#111111','w'],'로우라인':['lowline','lines','#2E5E4E','s'],
 '하이드아웃':['HIDEOUT','tent','#6B4F2A','c'],'어반트레일':['URBAN TRAIL','trail','#C2562B','c'],'클라우드핏':['cloudfit','cloud','#4A90C8','r'],'스텝라인':['STEPLINE','steps','#E0482C','c'],
 '런데이':['RUNDAY','bolt','#F2B705','w'],'데일리풋':['dailyfoot','foot','#5B7F95','r'],'하루랩':['HARU LAB','sunrise','#E07A3F','m'],'레더리':['Leathery','diamond','#7A4A2A','f'],
 '사운드핏':['SOUNDFIT','wave','#6C3FD1','w'],'오디오랩':['AUDIO LAB','phones','#16181D','m'],'핏트랙':['FITTRACK','pulse','#12A36C','c'],'타건공방':['TAGEON','key','#2B2D42','m'],
 '클릭랩':['click.lab','cursor','#2563EB','r'],'타임워크':['TIMEWORK','clock','#8A6D3B','f'],'소담키친':['sodam kitchen','bowl','#C0623D','f'],'키친하우스':['KITCHEN HOUSE','pot','#B23A48','c'],
 '흙빛공방':['HEULKBIT','vase','#9C6644','f'],'밝은방':['bright room','window','#E3B23C','r'],'폭신당':['POKSIN','puff','#D98BA6','r'],'향기온':['hyanggi on','flame','#9B5DE5','f'],
 '맑은결':['MALGEUN','drop','#3AA6B9','w'],'그린노트':['green note','leaf','#3E8E41','r'],'데이로그':['DAYLOG','sun','#F08A24','m'],'산지직송':['FARM DIRECT','pin','#2F7D32','c'],
 '바른곳간':['BAREUN','barn','#8C5A2B','f'],'들녘':['DEULNYEOK','wheat','#B08D2E','w'],'고기마을':['GOGI MAEUL','steak','#A11D2B','c'],'커피상점':['coffee store','bean','#5A3A22','f']}
/** font style key → CSS font shorthand (+ letter-spacing) */
export const LOGO_FONTS: Record<string, string> ={s:"800 15px 'Gothic A1',Arial,sans-serif",w:"800 12px Arial,sans-serif;letter-spacing:.22em",f:"700 italic 15px Georgia,'Times New Roman',serif",m:"700 13px 'Courier New',monospace;letter-spacing:.06em",r:"800 15px 'Trebuchet MS','Gothic A1',sans-serif",c:"900 13px 'Arial Narrow',Arial,sans-serif;letter-spacing:.06em"}
