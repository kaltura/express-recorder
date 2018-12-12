export default (config, env, helpers) => {
  delete config.entry.polyfills;
  config.output.filename = "[name].js";

  let { plugin } = helpers.getPluginsByName(config, "ExtractTextPlugin")[0];
  plugin.options.disable = true;

  config.module.loaders.push({
      test: /\.[tj]sx?$/,
      loader: "ts-loader"
  });

  if (env.production) {
    config.output.libraryTarget = "umd";
  }
};
