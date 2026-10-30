import {it} from "node:test";
import assert from "node:assert/strict";
import {marketingNotificationHref} from "./marketing-notification-link.ts";
it("opens Marketing request notifications read-only and removes create",()=>{
 assert.equal(marketingNotificationHref("/marketing?request=id&create=1"),"/marketing?request=id&readOnly=1");
 assert.equal(marketingNotificationHref("/marketing?tab=requests&request=id"),"/marketing?tab=requests&request=id&readOnly=1");
});
it("keeps library links and rejects unrelated destinations",()=>{
 assert.equal(marketingNotificationHref("/marketing?tab=agenda&event=id"),"/marketing?tab=agenda&event=id");
 for(const href of ["https://example.com/marketing","//example.com","/marketing-other","/admin"])
   assert.equal(marketingNotificationHref(href),null);
});
