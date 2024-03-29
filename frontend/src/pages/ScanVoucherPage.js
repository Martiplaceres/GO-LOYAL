import React, { useEffect, useState } from "react";
import axios from "axios";
import CoffeeCup from "../components/CoffeCup";
import { Card } from "react-bootstrap";
import { useSelector } from "react-redux";
import {
  BrowserRouter as Router,
  Link,
  useLocation,
  useHistory,
} from "react-router-dom";
import { selectToken } from "../store/user/selectors";

function useQuery() {
  const { search } = useLocation();

  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function ScanVoucherPage() {
  const query = useQuery();
  const voucherId = query.get("id");
  const [claimedVoucher, setClaimedVoucher] = useState(null);
  const token = useSelector(selectToken);
  const [errorMessage, setErrorMessage] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const response = await axios.put(
          `/api/vouchers/${voucherId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setClaimedVoucher(response.data);
        console.log(response.data);
        console.log("claimed voucher", claimedVoucher);
      } catch (e) {
        console.log("error", e.response.data);
        setErrorMessage(e.response.data);
      }
    })();
  }, []);

  return (
    <div>
      <div className="backgroundPages"></div>
      <div className="animation" style={{ paddingTop: "30px" }}>
        {errorMessage === null && claimedVoucher !== null ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Card className="card" style={{ width: "18rem" }}>
              <Card.Body>
                <Card.Title>
                  Valid for a free coffee at {claimedVoucher.store.name}
                </Card.Title>

                <CoffeeCup />
              </Card.Body>
            </Card>
          </div>
        ) : (
          <h2 class="boldTitle">{errorMessage}</h2>
        )}
      </div>
    </div>
  );
}
