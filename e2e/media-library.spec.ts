import {expect,test} from "@playwright/test";

for(const route of ["/","/projects","/who-we-are","/store","/education","/robotic-echoes"]){
  test("renders local media on "+route,async ({page})=>{
    await page.goto(route);
    const images=page.locator("#main-content img, header img, footer img");
    expect(await images.count()).toBeGreaterThan(0);
    const urls=await images.evaluateAll(els=>els.map(img=>img.getAttribute("src")||""));
    expect(urls,"all media must use our own local paths").toEqual(
      expect.arrayContaining([expect.stringMatching(/\/media\/[a-f0-9]{64}\.(webp|gif)$/)])
    );
    for(const url of urls){
      expect(url,"a Squarespace CDN image was left on "+route).not.toContain("squarespace-cdn.com");
      expect(url,"a nonlocal image was left on "+route).toMatch(/^\/media\/[a-f0-9]{64}\.(webp|gif)$/);
    }
    await images.first().scrollIntoViewIfNeeded();
    await expect.poll(async()=>images.first().evaluate((img)=>{
      const image=img as HTMLImageElement;
      return image.complete&&image.naturalWidth>0;
    })).toBe(true);
  });
}
