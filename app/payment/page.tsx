"use client";

import MidtransPayButton from "../components/MidtransPaymentButton";
import { useAuthStore } from "../Stores/authStores";

function page() {
  const userId = useAuthStore((state) => state.userId);
  return (
    <div className="flex justify-center items-center w-full min-h-[80vh]">
      <MidtransPayButton
        userId={userId}
        itemId="premium-data-access"
        itemName="Akses Data Premium"
        amount={50000}
        customerName="Babejong"
        customerEmail="user@email.com"
      />
    </div>
  );
}

export default page;
