import { expect, test } from "@playwright/test";

for (const width of [375, 768, 1440, 1920]) {
  test(`header uses a single menu at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.goto("/");
    const header=page.locator(".site-header");
    const menu=header.locator(".header-menu");
    const toggle=menu.locator("summary");
    const nav=menu.getByRole("navigation",{name:"Primary navigation"});
    await expect(header.getByRole("link",{name:"View Classes & Socials"})).toBeVisible();
    await expect(toggle).toBeVisible();
    await expect(nav).toBeHidden();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
    await toggle.click();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link",{name:"Blog",exact:true})).toHaveCount(1);
    await expect(nav.getByRole("link",{name:"Cart"})).toHaveCount(1);
    await expect(nav.getByRole("link",{name:"Sign in"})).toHaveCount(1);
    await toggle.click();
    await expect(nav).toBeHidden();
    await expect(header.getByRole("link",{name:"View Classes & Socials"})).toBeVisible();
  });
}

test("menu links navigate and retain account access",async({page})=>{
  await page.goto("/");
  const menu=page.locator(".site-header .header-menu");
  await menu.locator("summary").click();
  await menu.getByRole("link",{name:"Blog"}).click();
  await expect(page).toHaveURL(/\/blog$/);
  await expect(page.locator(".site-header .header-menu")).not.toHaveAttribute("open", "");
  await page.locator(".site-header .header-menu summary").click();
  await expect(page.getByRole("navigation",{name:"Primary navigation"}).getByRole("link",{name:"Sign in"})).toBeVisible();
});
