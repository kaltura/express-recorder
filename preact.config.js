export default (config, env, helpers) => {
  delete config.entry.polyfills;
  config.output.filename = "[name].js";

  let { plugin } = helpers.getPluginsByName(config, "ExtractTextPlugin")[0];
  plugin.options.disable = true;

  var loaders = config.module.loaders;
  for(let i = 0;i< loaders.length; i++) {
    const loader = loaders[i];
    const pattern = loader.test.toString();
    if (pattern.indexOf('svg') !== -1) {
      if (pattern !== `/\\.(svg|woff2?|ttf|eot|jpe?g|png|gif|mp4|mov|ogg|webm)(\\?.*)?$/i`) {
        throw new Error('Cannot continue with build, the preact webpack was modified, please fix scripts');
      }
      loader.test = /\.(woff2?|ttf|eot|jpe?g|png|gif|mp4|mov|ogg|webm)(\?.*)?$/i
      ;
    }
  }


  console.log(config.module.loaders);
  config.module.loaders.push({
      test: /\.[tj]sx?$/,
      loader: "ts-loader"
  },
    {
      test: /\.svg$/,
      use: ['preact-svg-loader'],
    });

  if (env.production) {
    config.output.libraryTarget = "umd";
  }
};
