module.exports = {
  appId: 'com.birthday-bucket.app',
  productName: 'Birthday Bucket',
  directories: {
    output: 'release'
  },
  files: [
    'out/**/*'
  ],
  mac: {
    target: ['dmg', 'zip'],
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  win: {
    target: ['nsis'],
    artifactName: '${productName}-${version}.${ext}'
  }
}
