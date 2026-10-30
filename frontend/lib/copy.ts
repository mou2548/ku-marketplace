/**
 * Every string the interface shows, in one place.
 *
 * The app ships in English only. This replaced the next-intl runtime, which
 * paid for locale negotiation, message loading and a React context on every
 * render to serve a single catalogue. Lookups here are a plain object walk, so
 * server components can read copy without awaiting anything.
 *
 * Keys are dotted paths into the tree below. `getCopy(namespace)` scopes the
 * lookups to one branch for screens that only touch their own section.
 *
 * Values keep the ICU subset the catalogue already used: `{name}` for simple
 * substitution and `{count, plural, ...}` with `#` for counted nouns, because
 * "1 item"/"2 items" cannot be assembled by concatenation.
 */

type CopyNode = string | { [key: string]: CopyNode };

const COPY: { [key: string]: CopyNode } = {
    "common": {
      "skipToMain": "Skip to main content"
    },
    "errors": {
      "network": "Could not reach the server. Try again.",
      "signedOut": "Your session has ended. Sign in again.",
      "generic": "Something went wrong. Try again.",
      "status": {
        "400": "That did not go through. Check the details and try again.",
        "401": "Your session has ended. Sign in again.",
        "403": "You cannot do this.",
        "404": "This no longer exists.",
        "409": "This changed while you were looking. Refresh and try again.",
        "429": "Too many attempts. Wait a moment and try again.",
        "500": "Something went wrong on our side. Try again in a moment."
      },
      "api": {
        "wrongCredentials": "Wrong email or password.",
        "emailTaken": "This email already has an account. Sign in instead.",
        "otpInvalid": "That code is wrong or has expired.",
        "otpMissing": "No active code for this email. Request a new one.",
        "noAccountForEmail": "No account uses this email.",
        "accountDeleted": "This account has been closed.",
        "accountNotFound": "Account not found.",
        "promptPayFormat": "PromptPay must be a 10-digit mobile number, such as 0812345678.",
        "promptPayTaken": "This PromptPay number is already used by another account.",
        "promptPayInUse": "You cannot remove PromptPay while you have open sale posts or unfinished deals.",
        "promptPayRequired": "Add your PromptPay number in your profile before selling.",
        "promptPayRequiredForCash": "Add your PromptPay number in your profile before accepting an offer with extra cash.",
        "sellerNoPromptPay": "The seller has not set up PromptPay yet, so this item cannot be bought right now.",
        "kuEmailOnly": "Use your Kasetsart University email (@ku.th or @ku.ac.th).",
        "passwordRequired": "Enter your password.",
        "passwordLength": "The password must be 8 to 64 characters.",
        "passwordLetterDigit": "The password needs at least one letter and one number.",
        "otpLength": "The code has 6 digits.",
        "handoverQrInvalid": "This code is wrong or has already been used.",
        "handoverQrExpired": "This code has expired. Ask for a new one.",
        "slipRequired": "Attach the transfer slip.",
        "uploadFailed": "The photo could not be uploaded. Try again.",
        "fileTooLarge": "The file must be 5 MB or smaller.",
        "fileType": "Only JPEG, PNG or WEBP images are supported.",
        "fileMissing": "Choose an image to upload.",
        "tooManyImages": "You can send up to 5 photos per message.",
        "emptyMessage": "Write a message or attach a photo.",
        "notInChat": "You are not part of this conversation.",
        "outOfStock": "This item is sold out.",
        "notEnoughStock": "There are not enough left.",
        "itemDeleted": "This item has been deleted.",
        "itemNotFound": "Item not found.",
        "postNotFound": "Listing not found.",
        "ownPostBuy": "You cannot buy your own listing.",
        "ownPostOffer": "You cannot make an offer on your own listing.",
        "ownOfferAccept": "You cannot accept an offer on your own listing.",
        "sellOnly": "This listing is for sale only.",
        "tradeOnly": "This listing is for trade only.",
        "noPrice": "This listing has no price set.",
        "offerNotPending": "This offer has already been answered.",
        "offerNotFound": "Offer not found.",
        "offeredItemsMissing": "Some of the offered items no longer exist.",
        "offeredItemsNotYours": "You can only offer items you own.",
        "deletePostWithDeals": "A listing with offers or deals cannot be deleted.",
        "quantityBelowSold": "Quantity cannot go below {sold}, the number already sold or traded.",
        "quantityAboveStock": "That is more than you have left of this item.",
        "nothingToUpdate": "There is nothing to change.",
        "reportRateLimit": "You can send up to {limit} reports in 10 minutes. Try again later.",
        "requestReviewed": "This request has already been reviewed.",
        "requestNotFound": "Request not found.",
        "membershipPending": "You already have a membership request waiting for review.",
        "membershipAmount": "{amount} baht does not match any membership tier.",
        "membershipMissing": "Your membership record is missing. Contact an admin.",
        "giveawayNotFound": "Giveaway not found.",
        "giveawayClosed": "Registration for this giveaway has closed.",
        "giveawayNotOpen": "This giveaway is not open for registration.",
        "giveawayNotStarted": "Registration has not opened yet.",
        "giveawayAlreadyJoined": "You have already registered.",
        "giveawayOwnJoin": "You cannot register for your own giveaway.",
        "giveawayFull": "All places have been taken.",
        "giveawayGiverOnly": "Only the giver can do this.",
        "giveawayEarlyClose": "Only Random and Manual giveaways can close registration early.",
        "giveawayNotManual": "This giveaway does not use manual selection.",
        "giveawayNotRandom": "This giveaway does not use a random draw.",
        "giveawayMaxRecipients": "You can choose up to {count} recipients.",
        "giveawayNoRecipients": "Choose at least one recipient.",
        "giveawayRecipientsNotWaiting": "Some of the chosen people are no longer waiting for selection.",
        "pickupNotStarted": "Pickup has not started yet.",
        "pickupOver": "The pickup deadline has passed.",
        "ticketNotReady": "This ticket is not ready for pickup.",
        "ticketNotFound": "Ticket not found.",
        "ticketInvalid": "This ticket code is wrong or has already been used.",
        "ticketOthers": "You cannot open another recipient's ticket.",
        "forfeitConfirm": "Confirm that you are giving up your place.",
        "forfeitOthers": "You cannot give up another recipient's place."
      }
    },
    "status": {
      "transaction": {
        "Pending": {
          "label": "Awaiting payment",
          "hint": "The buyer has not uploaded a transfer slip yet"
        },
        "PendingTrade": {
          "label": "Deal agreed",
          "hint": "Arranging the handover — no payment involved"
        },
        "Processing": {
          "label": "In progress",
          "hint": "Payment confirmed, waiting on handover"
        },
        "Completed": {
          "label": "Completed",
          "hint": "The item changed hands successfully"
        },
        "Cancelled": {
          "label": "Cancelled"
        },
        "Pending Refund": {
          "label": "Awaiting refund",
          "hint": "Waiting on the seller to transfer the money back"
        },
        "Refunded": {
          "label": "Refunded"
        }
      },
      "offer": {
        "Pending": {
          "label": "Awaiting response"
        },
        "Accepted": {
          "label": "Accepted"
        },
        "Rejected": {
          "label": "Declined"
        },
        "Cancelled": {
          "label": "Offer withdrawn"
        },
        "Withdrawn": {
          "label": "Offer withdrawn"
        }
      },
      "condition": {
        "New": {
          "label": "New"
        },
        "Very Good": {
          "label": "Very good"
        },
        "Good": {
          "label": "Good"
        },
        "Acceptable": {
          "label": "Acceptable"
        },
        "Poor": {
          "label": "Worn"
        }
      },
      "ticket": {
        "Registered": {
          "label": "Registered",
          "hint": "Waiting for the draw"
        },
        "Waiting": {
          "label": "Ready to collect",
          "hint": "Show your QR to the giver within the pickup window"
        },
        "Received": {
          "label": "Collected"
        },
        "Not_Selected": {
          "label": "Not selected"
        },
        "Forfeited": {
          "label": "Forfeited",
          "hint": "You gave up this collection before the pickup deadline"
        },
        "Expired": {
          "label": "Pickup window closed"
        }
      },
      "entrant": {
        "Registered": {
          "label": "Registered",
          "hint": "In the draw, not chosen yet"
        },
        "Selected": {
          "label": "Chosen",
          "hint": "A place is theirs"
        },
        "Not_Selected": {
          "label": "Not selected"
        },
        "Forfeited": {
          "label": "Forfeited"
        },
        "Expired": {
          "label": "Missed pickup"
        }
      },
      "allocation": {
        "FirstCome": {
          "label": "First come, first served",
          "hint": "Places are given in the order people register"
        },
        "Random": {
          "label": "Random draw",
          "hint": "Drawn at random when registration closes. Registering early makes no difference."
        },
        "Manual": {
          "label": "Giver picks",
          "hint": "The giver chooses recipients from the list of people who registered"
        }
      },
      "appointment": {
        "Pending": {
          "label": "Awaiting confirmation",
          "hint": "The other side has not answered this meetup yet"
        },
        "Confirmed": {
          "label": "Meetup confirmed"
        },
        "Rejected": {
          "label": "Meetup declined",
          "hint": "Propose another time"
        }
      },
      "giveaway": {
        "Active": {
          "label": "Open for entries"
        },
        "Closed": {
          "label": "Entries closed",
          "hint": "Recipients have been chosen; collection is still open"
        },
        "Completed": {
          "label": "Finished"
        }
      },
      "user": {
        "Suspended": {
          "label": "Suspended",
          "hint": "Access returns automatically when the suspension expires"
        },
        "Banned": {
          "label": "Banned",
          "hint": "The email is locked and cannot register again"
        },
        "Active": {
          "label": "Active"
        },
        "Deleted": {
          "label": "Closed"
        }
      },
      "sanction": {
        "Warning": {
          "label": "Warning",
          "hint": "Recorded on the account; access is unaffected"
        },
        "Suspend": {
          "label": "Suspension",
          "hint": "Access is blocked until the expiry date, then restored"
        },
        "Ban": {
          "label": "Permanent ban",
          "hint": "History is kept and the email is locked against re-registration"
        }
      },
      "subscription": {
        "Expired": {
          "label": "Expired",
          "hint": "Renew to get the tier benefits back"
        },
        "Active": {
          "label": "Active"
        },
        "Cancelled": {
          "label": "Cancelled"
        }
      },
      "subscriptionPayment": {
        "Pending": {
          "label": "Slip under review",
          "hint": "An admin is checking your transfer"
        },
        "Reject": {
          "label": "Slip rejected",
          "hint": "The amount did not match; send a new slip"
        },
        "Verified": {
          "label": "Payment verified"
        }
      },
      "report": {
        "Under_Investigation": {
          "label": "Under investigation"
        },
        "Violation_Confirmed": {
          "label": "Violation confirmed"
        },
        "Pending": {
          "label": "Awaiting review"
        },
        "Report_Dismissed": {
          "label": "Dismissed"
        }
      },
      "appeal": {
        "Pending": {
          "label": "Appeal submitted"
        },
        "Under_Review": {
          "label": "Appeal under review"
        },
        "Approved": {
          "label": "Appeal upheld"
        },
        "Rejected": {
          "label": "Appeal rejected"
        }
      },
      "item": {
        "Transferred": {
          "label": "Handed over"
        }
      },
      "postType": {
        "SellOnly": {
          "label": "For sale"
        },
        "TradeOnly": {
          "label": "For trade"
        },
        "Both": {
          "label": "Sale or trade"
        }
      },
      "prompt": {
        "propose-appointment": {
          "you": "Your turn: propose a meetup",
          "them": "Waiting on the proposer to arrange a meetup"
        },
        "upload-slip": {
          "you": "Your turn: transfer the money and upload the slip",
          "them": "Waiting on the buyer to pay and upload a slip"
        },
        "review-slip": {
          "you": "Your turn: check the slip and confirm payment",
          "them": "Waiting on the seller to check the slip"
        },
        "enter-tracking": {
          "you": "Your turn: enter the tracking number",
          "them": "Waiting on the seller to enter a tracking number"
        },
        "confirm-delivery": {
          "you": "Your turn: confirm once the parcel arrives",
          "them": "Waiting on the buyer to confirm delivery"
        },
        "scan-qr": {
          "you": "Your turn: scan the seller QR when you collect",
          "them": "Waiting on the meetup and QR scan"
        },
        "refund-slip": {
          "you": "Your turn: transfer the refund and upload the slip",
          "them": "Waiting on the seller to transfer the money back"
        },
        "confirm-refund": {
          "you": "Your turn: confirm the refund reached you",
          "them": "Waiting on the buyer to confirm the refund"
        },
        "completed": {
          "you": "This deal is complete",
          "them": "This deal is complete"
        },
        "cancelled": {
          "you": "This deal was cancelled",
          "them": "This deal was cancelled"
        },
        "refunded": {
          "you": "The refund is complete",
          "them": "The refund is complete"
        }
      },
      "deadline": {
        "seller-confirm-payment": {
          "label": "The seller must confirm payment within 24 hours"
        },
        "seller-ship": {
          "label": "Parcel due"
        },
        "cancel-response": {
          "label": "The other party must respond to the cancellation within 72 hours"
        },
        "registration-opens": {
          "label": "Registration opens"
        },
        "registration-closes": {
          "label": "Registration closes"
        },
        "draw": {
          "label": "Draw"
        },
        "pickup-opens": {
          "label": "Pickup opens"
        },
        "pickup-closes": {
          "label": "Pickup deadline"
        },
        "return-response": {
          "label": "Respond to the return request within 24 hours"
        },
        "refund-confirmation": {
          "label": "Confirm receipt of the refund"
        }
      }
    },
    "nav": {
      "brand": "KU Marketplace",
      "post": "Post",
      "postAnItem": "Post an item",
      "notifications": "Notifications",
      "account": "Account",
      "useDarkTheme": "Use dark theme",
      "useLightTheme": "Use light theme",
      "openMenu": "Open menu",
      "main": "Main",
      "market": "Market",
      "offers": "Offers",
      "history": "History",
      "chat": "Chat",
      "inventory": "Inventory",
      "giveaway": "Giveaway",
      "needsYou": "{count} items need your attention"
    },
    "feed": {
      "title": "Find it on campus",
      "subtitle": "Secondhand finds, trades, and giveaways from verified KU students.",
      "resultCount": "{count, plural, =0 {No listings} =1 {1 listing} other {# listings}}",
      "all": "All",
      "sale": "For sale",
      "trade": "For trade",
      "category": "Category",
      "condition": "Condition",
      "sortLabel": "Sort by",
      "sortNewest": "Newest first",
      "sortOldest": "Oldest first",
      "sortPriceAsc": "Price, low to high",
      "sortPriceDesc": "Price, high to low",
      "sortNameAsc": "Name, A to Z",
      "sortNameDesc": "Name, Z to A",
      "showResults": "{count, plural, =0 {Show no results} =1 {Show 1 result} other {Show # results}}",
      "postType": "Post type",
      "filters": "Filters",
      "searchLabel": "Search by item name or course code",
      "searchPlaceholder": "Search by item name or course code, e.g. 01417111",
      "emptyTitle": "Nothing matches that search",
      "emptyBody": "Try removing a filter, or search by course code instead of the book title. People name their posts differently.",
      "activeFilters": "Filtering by",
      "removeFilter": "Remove filter {label}",
      "chipSearch": "Search: {query}",
      "clearAll": "Clear all",
      "priceRange": "Price range (baht)",
      "priceMin": "No minimum",
      "priceMax": "No maximum",
      "priceFrom": "From {min} baht",
      "priceUpTo": "Up to {max} baht",
      "priceBetween": "{min}-{max} baht",
      "moreOptions": "More",
      "inStockOnly": "In stock only",
      "verifiedOnly": "Verified sellers only"
    },
    "card": {
      "wants": "Wants",
      "tradeOnly": "Trade only",
      "verified": "Verified with a KU email address",
      "noPhoto": "No photo",
      "photoUnavailable": "Photo unavailable",
      "conditionValue": {
        "New": "New",
        "Very Good": "Very good",
        "Good": "Good",
        "Acceptable": "Acceptable",
        "Poor": "Worn"
      }
    },
    "deal": {
      "proposeMeetup": "Propose this meetup",
      "resendMeetup": "Resend",
      "discardChanges": "Discard changes",
      "proposeTimeAndPlace": "Propose a time and place",
      "date": "Date",
      "time": "Time",
      "where": "Where",
      "wherePlaceholder": "e.g. สำนักหอสมุด มก. (หน้าประตูทางเข้าหลัก)",
      "whereHint": "Somewhere public and busy on campus",
      "meetupProposed": "Meetup proposed. Waiting on a reply.",
      "meetupWaitingOnPayment": "Waiting on payment",
      "meetupPaymentNotice": "The meetup can be arranged once the seller has confirmed the payment.",
      "stepArrangeMeetup": "Your step - arrange the meetup",
      "stepUploadSlip": "Your step - pay and upload the slip",
      "stepCheckSlip": "Your step - check the slip",
      "stepEnterTracking": "Your step - enter the tracking number",
      "stepConfirmArrived": "Your step - confirm the item arrived",
      "stepScanQr": "Your step - scan the QR at handover",
      "stepRefundSlip": "Your step - refund and upload the slip",
      "noMoneyExplainer": "There is no money in this trade, so the next thing to settle is where and when you swap.",
      "trackingNumber": "Tracking number",
      "trackingPlaceholder": "TH123456789KE",
      "trackingHint": "The buyer sees this the moment you save it",
      "saveAndNotify": "Save and notify the buyer",
      "confirmArrived": "Confirm the item arrived",
      "confirmArrivedBody": "Did the parcel arrive and match what was agreed? Confirm to close this deal.",
      "openScanner": "Open the scanner",
      "letBuyerScan": "Let the buyer scan",
      "showQr": "Show the QR",
      "letBuyerScanTitle": "Let the buyer scan to close the deal",
      "letBuyerScanBody": "Hand the item over first. Scanning closes the deal immediately and cannot be undone.",
      "backToConversations": "Back to conversations",
      "reportProblem": "Report a problem",
      "requestCancellation": "Request cancellation",
      "cancelTitle": "Request to cancel this deal",
      "cancelBody": "The other side has 72 hours to respond. If they do not, it goes to an admin.",
      "keepDeal": "Keep the deal",
      "sendCancelRequest": "Send cancellation request",
      "reason": "Reason",
      "reasonPlaceholder": "e.g. I can no longer make the meetup",
      "reasonHint": "A reason helps a lot. If the other side rejects it, this is the context an admin will see.",
      "progress": "Deal progress",
      "photoLimit": "Only the first 5 photos were attached.",
      "timePassed": "That time has already passed. Pick a later one.",
      "estimatedDelivery": "Estimated delivery date",
      "waitingOnYou": "Waiting on you",
      "slipRejectedSellerTitle": "Slip rejected - waiting on the buyer",
      "slipRejectedSellerBody": "The buyer needs to upload a new slip. You can check it once it arrives.",
      "refundSlipUploaded": "Refund slip uploaded",
      "refundPromptPayNeeded": "Add your PromptPay number so the seller can send your refund. It goes straight to that account.",
      "cancelAnswerBy": "Answer before the time runs out, or the request goes to an admin.",
      "cancelWaitingBy": "If {name} does not answer in time, the request goes to an admin.",
      "dealComplete": "Deal complete",
      "returnDaysLeft": "{count, plural, one {# day} other {# days}} left to ask for a return.",
      "requestReturn": "Request a return",
      "returnTitle": "Request a return",
      "returnBody": "Explain the reason. The other party must respond before goods or money are returned."
    },
    "history": {
      "title": "History",
      "goToMarket": "Go to the market",
      "giveaways": "Giveaways",
      "seeAll": "See all",
      "side": "Side",
      "status": "Status",
      "all": "All",
      "endedBadly": "Cancelled & refunds",
      "emptyTitle": "Nothing matches those filters",
      "emptyBody": "Clear a filter, or start something in the market — a room opens by itself when you buy or when an offer is accepted.",
      "purchaseRecord": "Your activity",
      "intro": "Every purchase, sale and trade in one place — including deals that were cancelled or refunded.",
      "buying": "Buying",
      "selling": "Selling",
      "giveawayMeta": "From {name} · collect at {location}",
      "trade": "Trade",
      "sale": "Sale",
      "noMoney": "No money",
      "boughtFrom": "Bought from {name}",
      "soldTo": "Sold to {name}",
      "total": "Total",
      "arrangeMeetup": "Arrange the meetup",
      "uploadSlip": "Upload your slip",
      "reviewSlip": "Check the slip",
      "enterTracking": "Add tracking number",
      "confirmDelivery": "Confirm it arrived",
      "scanHandover": "Scan at handover",
      "refundSlip": "Upload refund slip",
      "confirmRefund": "Confirm the refund",
      "openDeal": "Open the deal",
      "goToChat": "Go to chat"
    },
    "giveaway": {
      "communityShelf": "Community shelf",
      "title": "Giveaways",
      "subtitle": "Useful things from the KU community, passed on for free. Check how each recipient is chosen before entering.",
      "create": "Give something away",
      "open": "Open",
      "myEntries": "My entries",
      "emptyOpenTitle": "No open giveaways right now",
      "emptyOpenBody": "New drops appear here with the selection method and registration deadline shown upfront.",
      "emptyMineTitle": "You have not entered any giveaways",
      "emptyMineBody": "Enter a giveaway, then wait for the result. If selected, you will receive a QR ticket and access to the giver’s notes.",
      "collectAt": "Collect at {location}",
      "queueNumber": "Queue #{number}",
      "registered": "{count, plural, one {# registered} other {# registered}}",
      "methodFirstCome": "First come",
      "methodRandom": "Random draw",
      "methodManual": "Giver picks",
      "back": "Back to giveaways",
      "freeFromCommunity": "Free from the community",
      "about": "About this item",
      "giver": "Giver",
      "collectBy": "Collect by {date}",
      "collectWindow": "Collect {from} – {to}",
      "freeNote": "No payment is involved. Agree on collection details before you travel.",
      "manageRecipients": "Choose recipients",
      "registrationClosed": "Registration closed",
      "collectionTicket": "Collection ticket",
      "selected": "You were selected",
      "ticketHint": "Open this QR when you meet the giver. One code lasts 15 minutes; if it expires, reopen this ticket for a new one.",
      "giverNotes": "Notes from the giver"
    },
    "notifications": {
      "activity": "Activity log",
      "title": "Notifications",
      "subtitle": "Updates from your deals, offers, giveaways and account.",
      "unread": "{count} unread",
      "everything": "Everything",
      "deal": "Deals",
      "offer": "Offers",
      "giveaway": "Giveaways",
      "moderation": "Moderation",
      "emptyTitle": "Nothing of that kind yet",
      "emptyBody": "Updates appear here as activity happens.",
      "today": "Today",
      "yesterday": "Yesterday"
    },
    "account": {
      "settings": "Account settings",
      "title": "Account",
      "yourProfile": "Your profile",
      "profile": "Profile",
      "verified": "Verified KU student",
      "completedDeals": "{count, plural, one {# completed deal} other {# completed deals}}",
      "editProfile": "Edit profile",
      "membership": "Membership",
      "appeals": "My appeals",
      "close": "Close account",
      "signOut": "Sign out"
    },
    "membership": {
      "moreFromMarketplace": "More from the marketplace"
    },
    "chat": {
      "photosExpired": "Photos from this message have expired and are no longer shown.",
      "photoUnavailable": "This photo could not be loaded.",
      "viewFullSize": "View photo full size",
      "photo": "Photo",
      "attachImages": "Attach images, up to 5",
      "message": "Message",
      "writeMessage": "Write a message",
      "currentStep": "Current step",
      "charCount": "{count} of {max} characters",
      "notAnImage": "{count, plural, one {# file was} other {# files were}} not an image and left out.",
      "send": "Send",
      "searchConversations": "Search conversations",
      "search": "Search",
      "conversationType": "Conversation type",
      "sale": "Sale",
      "trade": "Trade",
      "giveaway": "Giveaway",
      "yourTurn": "Your turn",
      "inThisRoom": "In this room",
      "giver": "Giver",
      "chooseRecipients": "Choose recipients",
      "openGiveaway": "Open the giveaway",
      "inbox": "Messages",
      "noMatches": "No matches",
      "noConversations": "No conversations yet",
      "noNamedPerson": "Nobody named “{query}” is in this list.",
      "noMatchingConversation": "No item or person matches “{query}”.",
      "emptyBody": "A room opens automatically when you buy something, an offer is accepted, or you win a giveaway.",
      "sortBy": "Sort conversations",
      "sort_recent": "Recent",
      "sort_name": "Name",
      "sort_counterparty": "Person"
    },
    "appointment": {
      "meetup": "Meetup",
      "dateAndTime": "Date and time",
      "place": "Place",
      "openInMaps": "Open in Google Maps",
      "edit": "Edit",
      "accept": "Accept"
    },
    "slip": {
      "payTitle": "Pay {amount} by PromptPay",
      "payHow": "Scan this with your banking app. On a phone, save the QR and open it from your banking app's scan-from-photo option.",
      "payTo": "Pays the PromptPay account {account}",
      "payDirect": "The money goes straight to the seller; the platform never holds it. Upload the slip below once you have paid.",
      "membershipDirect": "Membership fees go to this account. Your banking app shows the account holder's name before you confirm. Upload the slip below once you have paid.",
      "paySave": "Save QR image",
      "payLoading": "Preparing the payment QR",
      "payQrFailed": "Could not prepare the payment QR. Upload the slip below once you have paid.",
      "payQrLabel": "PromptPay QR for {amount}",
      "refundQrTitle": "Refund {amount} by PromptPay",
      "refundQrTo": "Pays the buyer's PromptPay account {account}",
      "refundQrDirect": "The money goes straight back to the buyer. Upload the refund slip below once you have sent it.",
      "refundQrLoading": "Preparing the refund QR",
      "refundQrFailed": "Could not prepare the refund QR.",
      "upload": "Upload your transfer slip",
      "viewFull": "View full slip",
      "unavailable": "This slip could not be loaded.",
      "choose": "Choose a slip image",
      "formats": "JPG, PNG, GIF, SVG or WebP, up to 5 MB",
      "uploading": "Uploading",
      "check": "Check the slip and confirm payment",
      "checkMembership": "Check the slip against the requested tier",
      "amountDue": "Amount due",
      "amountWrong": "Amount is wrong",
      "confirmReceived": "Confirm payment received",
      "transferSlip": "Transfer slip",
      "viewFullscreen": "View the slip full screen",
      "previewHint": "Check the amount and the reference read clearly. You cannot replace the slip after sending it.",
      "confirmSend": "Send this slip",
      "change": "Choose another",
      "retry": "Try sending again",
      "sent": "Slip sent",
      "uploadedAt": "Uploaded",
      "uploadedByBuyerAt": "Buyer uploaded",
      "errorNotImage": "The file must be an image",
      "errorTooLarge": "The file is larger than 5 MB",
      "errorUploadFailed": "Upload failed. The slip is still here, try sending it again.",
      "errorChecking": "Checking the image",
      "refundSlip": "Refund slip",
      "paymentSlipOnFile": "Payment slip",
      "rejectTitle": "Reject this slip",
      "rejectBody": "Check your bank app first. The buyer sees your reason and can send a new slip.",
      "rejectReason": "What did you find?",
      "rejectPlaceholder": "e.g. Only 80 baht arrived, the price is 100",
      "rejectHint": "The buyer sees this. {count}/{max} characters.",
      "rejectKeep": "Back",
      "rejectSend": "Reject the slip",
      "rejected": "Slip rejected. The buyer has been told why.",
      "rejectedTitle": "The seller rejected your slip",
      "rejectedNoReason": "The seller could not match it to a transfer.",
      "rejectedNext": "Sort it out with the seller in chat if needed, then upload a new slip below."
    },
    "delivery": {
      "reportAfter": "You can report a problem after this",
      "copyTracking": "Copy the tracking number"
    },
    "datePicker": {
      "minDate": "Pick {date} or later",
      "maxDate": "Pick {date} or earlier"
    },
    "qr": {
      "confirm": "Confirm",
      "typeCode": "Type the code from the QR"
    },
    "inventory": {
      "title": "Inventory",
      "myStuff": "My stuff",
      "addItem": "Add an item",
      "addFirst": "Add your first item",
      "select": "Select",
      "cancel": "Cancel",
      "clear": "Clear",
      "list": "List",
      "emptySlot": "Empty slot",
      "itemsIn": "Items in my inventory",
      "selectHint": "Pick the items you want to handle together, then choose an action.",
      "emptyTitle": "Your inventory is empty",
      "emptyBody": "Put what you own in here first. Later you decide whether to sell it, open it to trades, or just keep it.",
      "backToStuff": "Back to my stuff",
      "onTheMarket": "On the market",
      "editListing": "Edit listing",
      "viewPublic": "View the public listing",
      "listIt": "List it on the market",
      "addAnotherListing": "Add another listing",
      "notListed": "Private item",
      "privateItemHint": "Only you can see this item until you publish a listing.",
      "available": "{count} still unlisted",
      "noneAvailable": "Nothing left to list",
      "given": "Given",
      "addedOn": "Added {date}",
      "details": "Details",
      "editDetails": "Edit details",
      "theRest": "The rest of your stuff",
      "inYourStash": "In your stash",
      "category": "Category",
      "condition": "Condition",
      "quantity": "Quantity",
      "photos": "Photos",
      "addPhotos": "Add photos",
      "itemName": "Item name",
      "itemNamePlaceholder": "e.g. Calculus textbook, volume 1",
      "courseCode": "Course code",
      "courseHint": "Most people search by course code. Adding it makes this far easier to find.",
      "brandModel": "Brand and model",
      "brandPlaceholder": "e.g. Keychron K2",
      "warranty": "Warranty expires",
      "warrantyHint": "Leave empty if it is out of warranty or never had one",
      "size": "Size",
      "sizePlaceholder": "e.g. M, 42, or 15 inch",
      "sizeHint": "Whatever the label says. This is the question every buyer asks first.",
      "conditionHint": "Condition shows as the border colour of the item, in your inventory and in the market. Be honest and the meetup goes smoothly.",
      "descHint": "Say honestly how long you have had it, what is wrong with it, and anything the next owner should know",
      "whatListing": "What you are listing",
      "backToItem": "Back to item",
      "listAnItem": "List an item",
      "editItem": "Edit item",
      "publish": "Publish listing",
      "saveChanges": "Save changes"
    },
    "listing": {
      "promptPayNeeded": "Add your PromptPay number before selling. Buyers transfer the payment to it.",
      "promptPayAction": "Add PromptPay",
      "kind": "What kind of listing is this",
      "sellOnly": "Cash only, no trades",
      "tradeOnly": "Trades only, not for sale",
      "both": "Buy it or trade for it. One post accepts both.",
      "price": "Price",
      "thb": "THB",
      "quantity": "Quantity to list",
      "quantityHint": "{count} still unlisted across the rest of your stock",
      "wantInTrade": "What do you want in trade",
      "wantPlaceholder": "e.g. Chemistry 1 textbook, or Calculus 2 notes",
      "wantHint": "Being specific filters out a lot of offers that miss the mark",
      "description": "Listing description",
      "descPlaceholder": "Meetup conditions, times that suit you, or anything else worth saying",
      "priceHintBoth": "This price applies to a direct purchase. Someone offering a trade proposes their own cash difference."
    },
    "offer": {
      "title": "Offers",
      "tradeDesk": "Trade desk",
      "inboxHint": "Compare both sides of every trade and see which offers need your decision.",
      "offersToMe": "Offers to me",
      "findTradeable": "Find items open to trade",
      "backToOffers": "Back to offers",
      "backToListing": "Back to listing",
      "accepted": "Offer accepted",
      "sent": "Offer sent",
      "openChat": "Open chat",
      "decline": "Decline",
      "declineTitle": "Decline this offer?",
      "declineBody": "The offer will be closed and cannot be accepted later.",
      "confirmDecline": "Decline offer",
      "acceptOffer": "Accept offer",
      "notYet": "Not yet",
      "confirmAcceptance": "Confirm acceptance",
      "withdraw": "Withdraw offer",
      "withdrawTitle": "Withdraw this offer?",
      "withdrawBody": "The owner will no longer be able to accept it.",
      "confirmWithdraw": "Withdraw offer",
      "confirmTrade": "Confirm the trade",
      "confirmTradeBody": "A trade is always handed over in person. Accepting declines every other offer on this post and opens a chat room.",
      "keepBrowsing": "Keep browsing",
      "myOffers": "My offers",
      "addToOffer": "Add to offer",
      "send": "Send offer",
      "emptyStash": "Your inventory is empty",
      "emptyStashBody": "You need items in your inventory before you can offer a trade. Add some, then come back to this post.",
      "quantityToOffer": "Quantity to offer",
      "youGet": "You get",
      "youGive": "You give",
      "whatYouReceive": "What you receive",
      "itemsComing": "Items coming to you",
      "yourSide": "Your side of the trade",
      "onTable": "Items on the trade table",
      "myInventory": "My inventory",
      "tapToPlace": "Tap an item to put it on the table",
      "tapToRemove": "Tap an item to take it back",
      "buildOffer": "Build your offer",
      "composeTitle": "Make the trade feel fair",
      "composeHint": "Choose from your inventory, compare both sides, then add cash only if it helps balance the deal.",
      "tradingFor": "You are trading for",
      "ownerWants": "The owner is looking for:",
      "reviewOffer": "Review this trade",
      "itemCount": "{count, plural, one {# item} other {# items}}",
      "fromPerson": "From {name}",
      "fromThem": "From them",
      "toPerson": "To {name}",
      "toThem": "To them",
      "youAdd": "You add",
      "theyAdd": "They add",
      "personAdds": "{name} adds",
      "yourExtraCash": "Extra cash you add, in baht",
      "theirExtraCash": "Extra cash they add, in baht",
      "receivedTitle": "{name} wants to trade",
      "sentTitle": "Your offer to {name}",
      "sentToPerson": "Sent to {name}",
      "receivedFromPerson": "From {name}",
      "openListing": "Open listing",
      "forYour": "for your",
      "forTheir": "for their",
      "acceptedBody": "You are trading with {name} for {item}, handed over in person. Every other offer on this post is declined and a chat room is open."
    },
    "market": {
      "backToMarket": "Back to market",
      "kuStudent": "KU student",
      "ownerLooking": "The owner is looking for",
      "details": "Details",
      "aboutItem": "About this item",
      "sellerNotes": "Seller's notes for this listing",
      "productInfo": "Product information",
      "available": "Available",
      "courseCode": "Course code",
      "model": "Model",
      "size": "Size",
      "warrantyUntil": "Warranty until",
      "seller": "Seller",
      "safeDealHint": "Check the item and agree on payment details in chat before completing the deal.",
      "moreFromSeller": "More from {seller}",
      "similarListings": "More in {category}",
      "buyNow": "Buy now",
      "soldOut": "Sold out",
      "confirmPurchase": "Confirm purchase",
      "offerTrade": "Offer a trade",
      "chooseDelivery": "Delivery method",
      "chooseDeliveryBody": "This cannot be changed after confirming.",
      "deliveryMethod": "Delivery method",
      "meetup": "Meetup",
      "shipping": "Shipping",
      "meetupBody": "Upload your payment slip, arrange a meetup, then scan the seller QR to complete.",
      "shippingBody": "Pay first, upload a slip, the seller confirms and posts it with a tracking number",
      "reportPost": "Report this post",
      "meetupCaption": "Arrange a time and place with the seller.",
      "shippingCaption": "Have the seller send it to your address.",
      "directPaymentNotice": "Confirm first, then arrange payment in chat. You pay the seller directly; the platform does not hold funds."
    },
    "seller": {
      "profile": "Seller profile",
      "publicProfile": "View public profile",
      "verified": "KU email verified",
      "joined": "Member since {date}",
      "followers": "{count, plural, one {# follower} other {# followers}}",
      "listings": "{count, plural, one {# active listing} other {# active listings}}",
      "follow": "Follow",
      "following": "Following",
      "unfollow": "Unfollow",
      "share": "Share",
      "copied": "Profile link copied",
      "shareError": "Could not share. Please copy the page URL.",
      "report": "Report seller",
      "fraud": "Fraud or impersonation",
      "harassment": "Harassment or inappropriate behaviour",
      "other": "Other",
      "edit": "Edit profile",
      "manage": "Manage listings",
      "back": "Browse marketplace",
      "products": "Available listings",
      "search": "Search this seller",
      "searchPlaceholder": "Item name or course",
      "category": "Category",
      "allCategories": "All categories",
      "type": "Listing type",
      "all": "All",
      "sell": "For sale",
      "trade": "For trade",
      "sort": "Sort by",
      "latest": "Newest first",
      "price_asc": "Price: low to high",
      "price_desc": "Price: high to low",
      "apply": "Apply",
      "clear": "Clear filters",
      "results": "{count, plural, one {# matching listing} other {# matching listings}}",
      "noMatches": "No matching listings",
      "noMatchesHint": "Try another search or clear your filters.",
      "empty": "No available listings",
      "emptyHint": "You can follow this seller and find their profile again later.",
      "emptyMine": "You have nothing listed",
      "emptyMineHint": "List something from your inventory and it appears here for other students.",
      "stateError": "Could not load your follow status.",
      "actionError": "Could not update following. Please try again.",
      "retry": "Try again",
      "unavailable": "Seller unavailable",
      "pagination": "Listing pages",
      "previous": "Previous",
      "next": "Next",
      "directory": "Followed sellers",
      "directoryHint": "Save sellers here so you can browse their listings again later.",
      "noFollowing": "No followed sellers on this page",
      "account": "Account",
      "loading": "Loading sellers and listings",
      "loadError": "Could not load this page",
      "viewAll": "View all listings",
      "categories": {
        "Books": "Books",
        "Clothing": "Clothing",
        "Electronics": "Electronics",
        "Home & Living": "Home & Living",
        "Bags": "Bags",
        "Vehicles": "Vehicles",
        "Sports": "Sports",
        "Stationery": "Stationery",
        "Tickets": "Tickets",
        "Other": "Other"
      },
      "allProducts": "All products",
      "productsLabel": "Products",
      "followersLabel": "Followers",
      "joinedLabel": "Joined",
      "price": "Price",
      "priceSort": "Sort by price",
      "quickPagination": "Quick page navigation",
      "openProfile": "Open {name}'s seller profile"
    },
    "reportDialog": {
      "postTitle": "Report this post",
      "userTitle": "Report this user",
      "description": "Choose the reason that best matches what happened. An admin reviews every report.",
      "close": "Close",
      "cancel": "Cancel",
      "submit": "Submit report",
      "submitted": "Report submitted. An admin will review it.",
      "reason": "Reason",
      "details": "Details",
      "placeholder": "Describe what happened",
      "hint": "Required, at least {min} characters. Describe what happened so an admin can review your report.",
      "error": "Could not submit the report."
    },
    "photo": {
      "close": "Close",
      "hint": "Pinch to zoom, swipe down to close",
      "zoomIn": "Zoom in",
      "zoomOut": "Zoom out",
      "fit": "Fit"
    },
    "category": {
      "books": "Books",
      "clothing": "Clothing",
      "electronics": "Electronics",
      "homeLiving": "Home & Living",
      "bags": "Bags",
      "vehicles": "Vehicles",
      "sports": "Sports",
      "stationery": "Stationery",
      "tickets": "Tickets",
      "other": "Other"
    }
  };

export type CopyParams = Record<string, string | number>;

/** Resolves a dotted key, e.g. `account.title` or `status.offer.Pending.label`. */
function resolve(key: string, scope: CopyNode): string | undefined {
  let node: CopyNode | undefined = scope;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Splits `=0 {none} one {# thing} other {# things}` into its clauses. Bodies
 * are brace-counted rather than regex-matched so a clause may itself contain
 * braces.
 */
function pluralClauses(source: string): Record<string, string> {
  const clauses: Record<string, string> = {};
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf("{", i);
    if (open === -1) break;
    const selector = source.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < source.length && depth > 0) {
      if (source[j] === "{") depth += 1;
      else if (source[j] === "}") depth -= 1;
      j += 1;
    }
    clauses[selector] = source.slice(open + 1, j - 1);
    i = j;
  }
  return clauses;
}

/** Picks the clause for `value`: an exact `=n` match, then `one`, then `other`. */
function selectPlural(clauses: Record<string, string>, value: number): string {
  const exact = clauses["=" + String(value)];
  if (exact !== undefined) return exact;
  if (value === 1 && clauses.one !== undefined) return clauses.one;
  return clauses.other ?? "";
}

/**
 * Substitutes `{name}` placeholders and expands `{name, plural, ...}` blocks.
 * A placeholder with no matching parameter is left as written, which makes the
 * gap visible on screen instead of rendering "undefined".
 */
function format(template: string, params?: CopyParams): string {
  if (!params || !template.includes("{")) return template;

  let out = "";
  let i = 0;
  while (i < template.length) {
    const open = template.indexOf("{", i);
    if (open === -1) {
      out += template.slice(i);
      break;
    }
    out += template.slice(i, open);

    let depth = 1;
    let j = open + 1;
    while (j < template.length && depth > 0) {
      if (template[j] === "{") depth += 1;
      else if (template[j] === "}") depth -= 1;
      j += 1;
    }
    const inner = template.slice(open + 1, j - 1);
    i = j;

    const comma = inner.indexOf(",");
    const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
    const value = params[name];

    if (value === undefined) {
      out += "{" + inner + "}";
      continue;
    }
    if (comma === -1) {
      out += String(value);
      continue;
    }

    const rest = inner.slice(comma + 1).trim();
    if (rest.startsWith("plural")) {
      const count = Number(value);
      const clause = selectPlural(pluralClauses(rest.slice("plural".length).replace(/^,/, "")), count);
      out += format(clause, params).split("#").join(String(count));
      continue;
    }
    out += String(value);
  }
  return out;
}

export type Copy = (key: string, params?: CopyParams) => string;

/**
 * Returns the lookup function for a branch of the tree, or for the whole tree
 * when no namespace is given. An unknown key returns the key itself so a typo
 * surfaces in place rather than blanking the element.
 */
export function getCopy(namespace?: string): Copy {
  const scope = namespace ? resolveNode(namespace) : COPY;
  return (key, params) => {
    const template = scope === undefined ? undefined : resolve(key, scope);
    if (template === undefined) return namespace ? namespace + "." + key : key;
    return format(template, params);
  };
}

/** Namespace lookup, which unlike `resolve` wants the subtree, not a string. */
function resolveNode(key: string): CopyNode | undefined {
  let node: CopyNode | undefined = COPY;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return node;
}
