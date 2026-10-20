"""HawkerReach Streamlit app.

Locally, auth comes from the Databricks CLI profile (DATABRICKS_CONFIG_PROFILE).
On Databricks Apps, it comes from the app's service principal.
"""

import os

import pandas as pd
import streamlit as st
from databricks import sql
from databricks.sdk.core import Config

CATALOG = "hawkerreach"

cfg = Config()


@st.cache_resource
def get_connection():
    warehouse_id = os.environ["DATABRICKS_WAREHOUSE_ID"]
    return sql.connect(
        server_hostname=cfg.host,
        http_path=f"/sql/1.0/warehouses/{warehouse_id}",
        credentials_provider=lambda: cfg.authenticate,
    )


@st.cache_data(ttl=600)
def query(statement: str) -> pd.DataFrame:
    with get_connection().cursor() as cursor:
        cursor.execute(statement)
        return cursor.fetchall_arrow().to_pandas()


st.set_page_config(page_title="HawkerReach", layout="wide")
st.title("HawkerReach")
st.caption("Connection check. Real pages come from the spec.")

try:
    st.write(query("SELECT current_user() AS user"))
    st.subheader(f"{CATALOG}.gold tables")
    st.dataframe(query(f"SHOW TABLES IN {CATALOG}.gold"))
except Exception as e:
    st.error(f"Could not reach the warehouse or the {CATALOG} catalog: {e}")
