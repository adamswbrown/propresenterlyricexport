module.exports = {
  appId: 'com.adamswbrown.propresenter-viewer',
  productName: 'ProPresenter Viewer',
  directories: {
    output: 'release-viewer',
    buildResources: 'build',
  },
  extraMetadata: {
    main: 'dist-viewer/main/index.js',
    version: '1.0.0',
  },
  files: [
    'dist-viewer/**/*',
    'viewer-app/assets/**/*',
    'package.json',
  ],
  extraResources: [
    {
      from: 'viewer/public',
      to: 'viewer-public',
    },
  ],
  mac: {
    icon: 'assets/icon.icns',
    artifactName: 'ProPresenter-Viewer-${version}-mac.${ext}',
    target: ['dmg', 'zip'],
    category: 'public.app-category.utilities',
    extendInfo: {
      LSUIElement: true,
    },
  },
  win: {
    icon: 'assets/icon.ico',
    artifactName: 'ProPresenter-Viewer-${version}-win.${ext}',
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
  nsis: {
    oneClick: true,
    perMachine: false,
  },
};
