export default ({ config }) => {
  const googleKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? '';
  return {
    ...config,
    expo: {
      ...config.expo,
      ios: {
        ...config.expo.ios,
        config: {
          ...(config.expo.ios?.config || {}),
          googleMapsApiKey: googleKey,
        },
      },
      android: {
        ...config.expo.android,
        config: {
          ...(config.expo.android?.config || {}),
          googleMaps: {
            ...(config.expo.android?.config?.googleMaps || {}),
            apiKey: googleKey,
          },
        },
      },
    },
  };
};
