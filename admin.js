const URL="https://ztesylgrlxudpnvhvtzd.supabase.co";
const KEY="sb_publishable_hz5ZZM19kaJsR7sd1sFeig_AZbJkS-s";
const BUCKET="Product-images", db=window.supabase.createClient(URL,KEY);
const $=id=>document.getElementById(id); let products=[], user=null;
const msg=(id,s)=>$(id).textContent=s;
async function enter(u){
 const {data,error}=await db.from("admins").select("email,role").eq("user_id",u.id).maybeSingle();
 if(error||!data||!["admin","super_admin"].includes(data.role)){await db.auth.signOut();msg("loginMsg","Accès refusé : compte non administrateur.");return;}
 user=u;$("login").classList.add("hidden");$("app").classList.remove("hidden");
 $("identity").textContent=data.email+" — "+data.role;
 $("admins").classList.toggle("hidden",data.role!=="super_admin"); await load();
}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();const {data,error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error){msg("loginMsg",error.message);return;}await enter(data.user);});
$("logout").onclick=async()=>{await db.auth.signOut();location.reload();};
async function load(){
 const {data,error}=await db.from("products").select("*").order("created_at",{ascending:false});
 if(error){$("products").textContent=error.message;return;}
 products=data||[];$("count").textContent=products.length;
 $("products").innerHTML=products.map(p=>`<div class="item"><b>${esc(p.name)}</b> — ${p.published?"Publié":"Brouillon"}<br>${Number(p.price_xaf||0).toLocaleString("fr-FR")} FCFA<br><button data-edit="${p.id}">Modifier</button> <button class="danger" data-del="${p.id}">Supprimer</button></div>`).join("")||"Aucun produit.";
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>edit(b.dataset.edit));
 document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>del(b.dataset.del));
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();msg("formMsg","Enregistrement…");
 try{
  const id=$("pid").value, old=products.find(p=>p.id===id);let image_url=old?.image_url||null,file=$("photo").files[0];
  if(file){const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"");const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
   const up=await db.storage.from(BUCKET).upload(path,file,{contentType:file.type||"image/jpeg"});if(up.error)throw up.error;image_url=path;}
  const row={name:$("name").value.trim(),description:$("description").value.trim(),price_xaf:$("price").value?Number($("price").value):null,category:$("category").value.trim()||null,image_url,published:$("published").checked,updated_at:new Date().toISOString()};
  // seller_id volontairement omis : vérifier sa nullabilité avant le premier ajout.
  const result=id?await db.from("products").update(row).eq("id",id):await db.from("products").insert(row);
  if(result.error)throw result.error;msg("formMsg","Produit enregistré.");reset();await load();
 }catch(err){msg("formMsg","Erreur : "+err.message);}
});
function edit(id){const p=products.find(x=>x.id===id);$("pid").value=p.id;$("name").value=p.name||"";$("description").value=p.description||"";$("price").value=p.price_xaf??"";$("category").value=p.category||"";$("published").checked=!!p.published;$("formTitle").textContent="Modifier le produit";$("cancel").classList.remove("hidden");window.scrollTo(0,0);}
function reset(){$("productForm").reset();$("pid").value="";$("formTitle").textContent="Ajouter un produit";$("cancel").classList.add("hidden");}
$("cancel").onclick=reset;
async function del(id){const p=products.find(x=>x.id===id);if(!confirm("Supprimer "+p.name+" ?"))return;const {error}=await db.from("products").delete().eq("id",id);if(error){alert(error.message);return;}if(p.image_url&&!p.image_url.startsWith("http"))await db.storage.from(BUCKET).remove([p.image_url]);await load();}
(async()=>{const {data:{session}}=await db.auth.getSession();if(session)await enter(session.user);})();
