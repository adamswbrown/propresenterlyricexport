module.exports = {
  appId: 'com.adamswbrown.propresenterwords',
  productName: 'ProPresenter Lyrics',
  publish: {
    provider: 'github',
    owner: 'adamswbrown',
    repo: 'propresenterlyricexport',
  },
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: [
    'dist-electron/**/*',
    'package.json',
  ],
  mac: {
    icon: 'assets/icon.icns',
    artifactName: 'ProPresenter-Lyrics-${version}-mac.${ext}',
    target: ['dmg', 'zip'],
    category: 'public.app-category.music',
  },
  win: {
    icon: 'assets/icon.ico',
    artifactName: 'ProPresenter-Lyrics-${version}-win.${ext}',
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
  nsis: {
    oneClick: false,
    allowElevation: true,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
  },
};
