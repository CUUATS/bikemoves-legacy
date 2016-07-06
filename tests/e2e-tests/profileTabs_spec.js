describe("Testing the Profile Tab", function(){
  it("shoud be able to click on the gender button", function(){
      expect(element(by.model('profile.gender')).isPresent()).toBe(true);
      element(by.model('profile.gender')).click();
  });
});
