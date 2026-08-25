(() => {
  try {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
    document.querySelector('#theme-color')?.setAttribute('content', isDark ? '#090C15' : '#FAF7F2')
  } catch (_) {
    document.documentElement.style.colorScheme = 'light'
  }
})()
