import {expect,test} from "@playwright/test";

test("public events exclude archived records and calendar stays non-bookable", async ({page})=>{
  await page.goto("/events");
  await expect(page.getByRole("heading",{name:"Events"})).toBeVisible();
  await expect(page.getByText("No events are currently published.")).toBeVisible();
  await page.goto("/community");
  await expect(page.locator(".community-calendar")).toBeVisible();
  await expect(page.locator(".community-calendar-event")).toHaveCount(0);
});

test("events staff route requires authentication",async({page})=>{
  await page.goto("/staff/events");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading",{name:"Sign in to EmpressVR"})).toBeVisible();
});
