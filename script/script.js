// Utilities
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Simple currency formatter
const fmt = (n) => "$" + n.toFixed(2);

// Luhn algorithm for card validation (returns boolean)
function luhnCheck(num) {
	const digits = num
		.replace(/\s+/g, "")
		.split("")
		.reverse()
		.map((d) => parseInt(d, 10));
	if (digits.some(isNaN) || digits.length < 12) return false;
	let sum = 0;
	for (let i = 0; i < digits.length; i++) {
		let d = digits[i];
		if (i % 2 === 1) {
			d *= 2;
			if (d > 9) d -= 9;
		}
		sum += d;
	}
	return sum % 10 === 0;
}

// Load cart from localStorage (key 'cart:v1')
const CART_KEY = "cart:v1";
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

// If cart empty, prefill sample to demonstrate (optional)
// (Comment the following block if you always expect a populated cart)
if (!cart || cart.length === 0) {
	// A small helpful note — remove this in production if undesired.
	// cart = [
	//   { productId: 1, title: 'Demo Jacket', price: 79.99, image: '', quantity: 1 },
	//   { productId: 2, title: 'Demo Watch', price: 49.99, image: '', quantity: 2 }
	// ];
	// localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// DOM references
const orderItemsEl = $("#order-items");
const subtotalEl = $("#subtotal");
const shippingEl = $("#shipping");
const totalEl = $("#total");

// Payment method tracking
let paymentMethod = "card";

// Render order summary
function renderOrderSummary() {
	orderItemsEl.innerHTML = "";
	if (!cart || cart.length === 0) {
		orderItemsEl.innerHTML = `<p class="text-sm text-gray-500">Your cart is empty. <a href="shop.html" class="text-[color:var(--gb-primary)] underline">Continue shopping</a></p>`;
		subtotalEl.textContent = "$0.00";
		shippingEl.textContent = "$0.00";
		totalEl.textContent = "$0.00";
		return;
	}

	let subtotal = 0;
	cart.forEach((item) => {
		const itemEl = document.createElement("div");
		itemEl.className = "flex items-center gap-3";
		itemEl.innerHTML = `
          <img src="${
						item.image || "https://via.placeholder.com/60"
					}" alt="${escapeHtml(
			item.title
		)}" class="w-14 h-14 object-contain rounded" />
          <div class="flex-1">
            <div class="text-sm font-medium">${escapeHtml(item.title)}</div>
            <div class="text-xs text-gray-500">Qty: ${item.quantity} × ${fmt(
			item.price
		)}</div>
          </div>
          <div class="font-medium">${fmt(item.price * item.quantity)}</div>
        `;
		orderItemsEl.appendChild(itemEl);
		subtotal += item.price * item.quantity;
	});

	subtotalEl.textContent = fmt(subtotal);

	// simple shipping rule: $0 if subtotal >= 100, else $5
	const shipping = subtotal >= 100 ? 0 : subtotal === 0 ? 0 : 5;
	shippingEl.textContent = fmt(shipping);

	totalEl.textContent = fmt(subtotal + shipping);
}

// escapeHtml helper
function escapeHtml(str) {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

// Wire up payment method buttons
document.querySelectorAll("[data-pay]").forEach((btn) => {
	btn.addEventListener("click", (e) => {
		document
			.querySelectorAll("[data-pay]")
			.forEach((b) =>
				b.classList.remove("ring-2", "ring-[color:var(--gb-primary)]")
			);
		e.currentTarget.classList.add("ring-2", "ring-[color:var(--gb-primary)]");
		paymentMethod = e.currentTarget.getAttribute("data-pay");
		document.getElementById("card-fields").style.display =
			paymentMethod === "card" ? "block" : "none";
	});
});

// Same-as-billing toggle
$("#same-as-billing").addEventListener("change", (e) => {
	const shp = $("#shipping-fields");
	if (e.target.checked) {
		shp.classList.add("hidden");
	} else {
		shp.classList.remove("hidden");
	}
});

// simple input helpers to format card number and expiry
$("#card-number").addEventListener("input", (e) => {
	let v = e.target.value.replace(/\D/g, "").slice(0, 16);
	v = v.match(/.{1,4}/g)?.join(" ") || v;
	e.target.value = v;
});
$("#card-exp").addEventListener("input", (e) => {
	let v = e.target.value.replace(/\D/g, "").slice(0, 4);
	if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
	e.target.value = v;
});

// validate fields helper
function validateForm() {
	let ok = true;

	const fullname = $("#bill-fullname").value.trim();
	const email = $("#bill-email").value.trim();
	const phone = $("#bill-phone").value.trim();
	const address = $("#bill-address").value.trim();
	const city = $("#bill-city").value.trim();
	const state = $("#bill-state").value.trim();
	const postcode = $("#bill-postcode").value.trim();

	// name
	if (!fullname) {
		showErr("err-bill-fullname");
		ok = false;
	} else hideErr("err-bill-fullname");
	// email basic
	if (!/^\S+@\S+\.\S+$/.test(email)) {
		showErr("err-bill-email");
		ok = false;
	} else hideErr("err-bill-email");
	// phone basic digits
	if (!/^[\d+\s()-]{7,}$/.test(phone)) {
		showErr("err-bill-phone");
		ok = false;
	} else hideErr("err-bill-phone");
	if (!address) {
		showErr("err-bill-address");
		ok = false;
	} else hideErr("err-bill-address");
	if (!city) {
		showErr("err-bill-city");
		ok = false;
	} else hideErr("err-bill-city");
	if (!state) {
		showErr("err-bill-state");
		ok = false;
	} else hideErr("err-bill-state");
	if (!postcode) {
		showErr("err-bill-postcode");
		ok = false;
	} else hideErr("err-bill-postcode");

	// payment-specific
	if (paymentMethod === "card") {
		const cardNum = $("#card-number").value.replace(/\s+/g, "");
		if (!luhnCheck(cardNum)) {
			$("#err-card-number").classList.remove("hidden");
			ok = false;
		} else {
			$("#err-card-number").classList.add("hidden");
		}
		// additional card fields lightly validated
		if (!$("#card-name").value.trim()) ok = false;
		if (!$("#card-exp").value.trim()) ok = false;
		if (!$("#card-cvv").value.trim()) ok = false;
	}

	return ok;
}
function showErr(id) {
	const e = $("#" + id);
	if (e) e.classList.remove("hidden");
}
function hideErr(id) {
	const e = $("#" + id);
	if (e) e.classList.add("hidden");
}

// place order handler
$("#place-order-btn").addEventListener("click", async () => {
	// basic guard: cart must have items
	if (!cart || cart.length === 0) {
		alert("Your cart is empty. Please add items before checking out.");
		return;
	}

	// validate form
	if (!validateForm()) {
		window.scrollTo({ top: 0, behavior: "smooth" });
		return;
	}

	// disable button while processing
	const btn = $("#place-order-btn");
	btn.disabled = true;
	btn.textContent = "Placing order...";

	// gather order data
	const subtotal = cart.reduce((s, it) => s + it.price * it.quantity, 0);
	const shippingCost = subtotal >= 100 ? 0 : subtotal === 0 ? 0 : 5;
	const total = +(subtotal + shippingCost).toFixed(2);

	const billing = {
		name: $("#bill-fullname").value.trim(),
		email: $("#bill-email").value.trim(),
		phone: $("#bill-phone").value.trim(),
		company: $("#bill-company").value.trim(),
		address: $("#bill-address").value.trim(),
		city: $("#bill-city").value.trim(),
		state: $("#bill-state").value.trim(),
		postal: $("#bill-postcode").value.trim(),
	};

	let shipping = null;
	if (!$("#same-as-billing").checked) {
		shipping = {
			name: $("#ship-fullname").value.trim(),
			phone: $("#ship-phone").value.trim(),
			address: $("#ship-address").value.trim(),
			city: $("#ship-city").value.trim(),
			state: $("#ship-state").value.trim(),
			postal: $("#ship-postcode").value.trim(),
		};
	} else {
		shipping = { ...billing };
	}

	// mock payment handling (simulate delay)
	await new Promise((r) => setTimeout(r, 800));

	// Generate simple order id
	const orderId = "GB" + Date.now().toString(36).toUpperCase().slice(-8);

	// Save order to localStorage as mock record
	const order = {
		id: orderId,
		createdAt: new Date().toISOString(),
		items: cart,
		totals: { subtotal, shipping: shippingCost, total },
		billing,
		shipping,
		paymentMethod,
	};

	localStorage.setItem("order:last", JSON.stringify(order));

	// Clear cart
	localStorage.removeItem(CART_KEY);
	cart = [];

	// show confirmation
	showConfirmation(order);

	// reset button
	btn.disabled = false;
	btn.textContent = "Place Order";
});

function showConfirmation(order) {
	// hide checkout grid
	$("#checkout-grid").classList.add("hidden");

	// populate confirmation block & show
	$("#conf-order-id").textContent = order.id;

	// items
	const confItems = $("#conf-items");
	confItems.innerHTML = "";
	order.items.forEach((it) => {
		const el = document.createElement("div");
		el.className = "flex justify-between items-center py-2 border-b";
		el.innerHTML = `<div class="text-sm">${escapeHtml(
			it.title
		)} <span class="text-xs text-gray-500">x${it.quantity}</span></div>
                        <div class="font-medium">${fmt(
													it.price * it.quantity
												)}</div>`;
		confItems.appendChild(el);
	});

	// totals
	const totBlock = document.createElement("div");
	totBlock.className = "mt-4";
	totBlock.innerHTML = `<div class="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>${fmt(
		order.totals.subtotal
	)}</span></div>
                            <div class="flex justify-between text-sm text-gray-600"><span>Shipping</span><span>${fmt(
															order.totals.shipping
														)}</span></div>
                            <div class="flex justify-between text-lg font-semibold mt-2"><span>Total</span><span>${fmt(
															order.totals.total
														)}</span></div>`;
	confItems.appendChild(totBlock);

	// show confirmation area
	$("#confirmation").classList.remove("hidden");
	// Scroll there
	setTimeout(() => {
		$("#confirmation").scrollIntoView({ behavior: "smooth" });
	}, 100);
}

// initial render
renderOrderSummary();

// set footer year
$("#year").textContent = new Date().getFullYear();

// If user clicks view order (opens stored order overview)
$("#view-order-btn").addEventListener("click", () => {
	const ord = JSON.parse(localStorage.getItem("order:last") || "null");
	if (!ord) return alert("No recent order found.");
	// Could route to order details page; for now show JSON preview
	const win = window.open("", "_blank", "noopener");
	win.document.title = `Order ${ord.id}`;
	win.document.body.style.fontFamily =
		'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
	win.document.body.innerHTML = `<pre style="white-space:pre-wrap;padding:20px;">${JSON.stringify(
		ord,
		null,
		2
	)}</pre>`;
});
