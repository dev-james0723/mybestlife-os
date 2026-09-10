import { beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ results: [] as unknown[], writes: [] as Record<string, unknown>[] }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({from: () => {
 const chain = {insert: (value: Record<string,unknown>) => {fixture.writes.push(value);return chain;},select: () => chain,single: () => Promise.resolve(fixture.results.shift())};return chain;
}}) }));
import { relationshipsRepository } from "./relationships";
const basicContact = {
 person_name:"Test contact",category:"friend",relationship_strength:"new",photo_url:null,email:null,phone:null,
 last_contact_date:null,last_interaction_notes:null,next_action:null,next_action_date:null,commitments_made:null,
 preferences_and_details:null,general_notes:null,tags:[],linked_project_id:null,is_favorite:false,
};
const missing = {data:null,error:{code:"PGRST204",message:"Could not find the 'social_links' column of 'relationships'"}};
const saved = {data:{id:"contact-1",person_name:"Test contact",category:"friend",created_at:"2026-09-07"},error:null};
describe("contacts during additive schema rollout", () => {
 beforeEach(() => {fixture.results=[];fixture.writes=[];});
 it("can save a basic contact when the deployed schema lacks optional fields", async () => {
  fixture.results=[missing,saved];
  const result=await relationshipsRepository.create(basicContact);
  expect(result.person_name).toBe("Test contact");expect(result.social_links).toEqual([]);
  expect(fixture.writes).toHaveLength(2);expect(fixture.writes[1]).not.toHaveProperty("social_links");expect(fixture.writes[1].person_name).toBe("Test contact");
 });
 it("does not silently discard links that the user supplied", async () => {
  fixture.results=[missing];
  await expect(relationshipsRepository.create({...basicContact,linked_goal_ids:["goal-1"]})).rejects.toThrow("need an update");
  expect(fixture.writes).toHaveLength(1);
 });
 it("never retries an uncertain network failure as a new insert", async () => {
  fixture.results=[{data:null,error:{code:"FETCH_ERROR",message:"network unavailable"}}];
  await expect(relationshipsRepository.create(basicContact)).rejects.toMatchObject({code:"FETCH_ERROR"});
  expect(fixture.writes).toHaveLength(1);
 });
});
