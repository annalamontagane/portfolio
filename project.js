const sections = document.querySelectorAll('.project-main section');
const navLinks = document.querySelectorAll('.section-nav a');

// Create an intersection observer
const observerOptions = {
  rootMargin: '-32px 0px -90% 0px', 
  threshold: 0
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      
      // Remove active from all links
      navLinks.forEach(link => {
        link.classList.remove('active');
      });
      
      // Add active to matching link
      navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${id}`) {
          link.classList.add('active');
        }
      });
    }
  });
}, observerOptions);

// Observe all sections
sections.forEach(section => {
  observer.observe(section);
});


// ─── Video control panels ──────────────────────────────────

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function buildControls() {
  return `
    <div class="vid-controls-inner">
      <button class="vid-btn" data-action="playpause" title="play / pause">
        <svg viewBox="0 0 10 10"><polygon points="2,1 9,5 2,9"/></svg>
      </button>
      <button class="vid-btn" data-action="rewind" title="rewind 5s">
        <svg viewBox="0 0 10 10">
          <polygon points="5,1 0,5 5,9"/>
          <rect x="6" y="1" width="1.5" height="8"/>
        </svg>
      </button>
      <div class="vid-progress-wrap">
        <div class="vid-progress">
          <div class="vid-progress-fill"></div>
        </div>
        <span class="vid-time">0:00</span>
      </div>
      <button class="vid-btn" data-action="mute" title="mute / unmute">
        <svg viewBox="0 0 10 10">
          <path d="M1,3.5 L3.5,3.5 L6,1 L6,9 L3.5,6.5 L1,6.5 Z"/>
          <path class="sound-wave" d="M7.5,3.5 Q9.5,5 7.5,6.5" fill="none" stroke="currentColor" stroke-width="0.8" style="display:none"/>
          <line class="mute-line" x1="7.5" y1="3" x2="9.5" y2="7" stroke="currentColor" stroke-width="1"/>
        </svg>
      </button>
    </div>
  `;
}

function initVideoControls(video) {
  const wrapper = document.createElement('div');
  wrapper.className = 'vid-wrapper';
  video.parentNode.insertBefore(wrapper, video);
  wrapper.appendChild(video);

  const panel = document.createElement('div');
  panel.className = 'vid-controls';
  panel.innerHTML = buildControls();
  video.muted = true;
  wrapper.appendChild(panel);

  const playBtn    = panel.querySelector('[data-action="playpause"]');
  const playIcon   = playBtn.querySelector('svg');
  const playLabel  = playBtn.querySelector('span');
  const rewindBtn  = panel.querySelector('[data-action="rewind"]');
  const muteBtn    = panel.querySelector('[data-action="mute"]');
  const muteLabel  = muteBtn.querySelector('span');
  const soundWave  = panel.querySelector('.sound-wave');
  const muteLine   = panel.querySelector('.mute-line');
  const progressEl = panel.querySelector('.vid-progress');
  const fill       = panel.querySelector('.vid-progress-fill');
  const timeEl     = panel.querySelector('.vid-time');

  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    fill.style.width = (video.currentTime / video.duration * 100) + '%';
    timeEl.textContent = formatTime(video.currentTime);
  });

  video.addEventListener('play', () => {
    playIcon.innerHTML = '<rect x="1.5" y="1" width="2.5" height="8"/><rect x="6" y="1" width="2.5" height="8"/>';
    playLabel.textContent = 'pause';
  });

  video.addEventListener('pause', () => {
    playIcon.innerHTML = '<polygon points="2,1 9,5 2,9"/>';
    playLabel.textContent = 'play';
  });

  playBtn.addEventListener('click', () => {
    video.paused ? video.play() : video.pause();
  });

  rewindBtn.addEventListener('click', () => {
    video.currentTime = Math.max(0, video.currentTime - 5);
  });

  muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    soundWave.style.display = video.muted ? 'none' : '';
    muteLine.style.display  = video.muted ? '' : 'none';
    muteLabel.textContent   = video.muted ? 'unmute' : 'mute';
  });

  progressEl.addEventListener('click', e => {
    const rect = progressEl.getBoundingClientRect();
    video.currentTime = ((e.clientX - rect.left) / rect.width) * video.duration;
  });
}

document.querySelectorAll('video[data-controlled]').forEach(initVideoControls);