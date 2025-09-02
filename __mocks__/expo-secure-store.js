module.exports = {
  getItemAsync: jest.fn(async (key) => {
    if (key === "auth_token") return "mock.jwt.token.for.testing";
    return null;
  }),
  setItemAsync: jest.fn(async () => true),
  deleteItemAsync: jest.fn(async () => true),
};
