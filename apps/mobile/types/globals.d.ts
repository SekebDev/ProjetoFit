/** Router mockado exposto por jest.setup.js para assercoes de navegacao. */
declare global {
  var mockRouter: {
    replace: jest.Mock;
    push: jest.Mock;
    back: jest.Mock;
  };
}

export {};
