module.exports = {
  appId: 'com.adamswbrown.propresenter-proxy',
  productName: 'ProPresenter Web Proxy',
  directories: {
    output: 'release-proxy',
    buildResources: 'build',
  },
  extraMetadata: {
    main: 'dist-proxy/main/index.js',
  },
  files: [
    'dist-proxy/**/*',
    'package.json',
  ],
  extraResources: [
    {
      from: 'executables/pp-web-server',
      to: 'pp-web-server',
    },
  ],
  mac: {
    icon: 'assets/icon.icns',
    artifactName: 'ProPresenter-WebProxy-${version}-mac.${ext}',
    target: ['zip'],
    category: 'public.app-category.utilities',
    extendInfo: {
      LSUIElement: true,
    },
  },
  win: {
    icon: 'assets/icon.ico',
    artifactName: 'ProPresenter-WebProxy-${version}-win.${ext}',
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
