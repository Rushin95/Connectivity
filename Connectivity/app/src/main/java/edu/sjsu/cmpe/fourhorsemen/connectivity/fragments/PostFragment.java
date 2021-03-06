package edu.sjsu.cmpe.fourhorsemen.connectivity.fragments;

import android.content.Context;
import android.os.Bundle;
import android.support.v4.app.Fragment;
import android.support.v7.widget.GridLayoutManager;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import edu.sjsu.cmpe.fourhorsemen.connectivity.R;
import edu.sjsu.cmpe.fourhorsemen.connectivity.beans.Post;
import edu.sjsu.cmpe.fourhorsemen.connectivity.beans.Profile;
import edu.sjsu.cmpe.fourhorsemen.connectivity.utilities.PreferenceHandler;
import edu.sjsu.cmpe.fourhorsemen.connectivity.utilities.ProjectProperties;
import edu.sjsu.cmpe.fourhorsemen.connectivity.utilities.RequestHandler;
import edu.sjsu.cmpe.fourhorsemen.connectivity.utilities.ResponseHandler;

/**
 * A fragment representing a list of Items.
 * <p/>
 * Activities containing this fragment MUST implement the {@link OnListFragmentInteractionListener}
 * interface.
 */
public class PostFragment extends Fragment {

    private final static String TAG = PostFragment.class.getSimpleName();
    // TODO: Customize parameter argument names
    private static final String ARG_COLUMN_COUNT = "column-count";
    private static final String PROFILE_ID = "profile-id";
    // TODO: Customize parameters
    private int mColumnCount = 1;
    private OnListFragmentInteractionListener mListener;
    RecyclerView recyclerView;
    RecyclerView.Adapter mAdapter;
    private int profileID;

    /**
     * Mandatory empty constructor for the fragment manager to instantiate the
     * fragment (e.g. upon screen orientation changes).
     */
    public PostFragment() {
        Log.d("Post Fragment", "Creating New Instance --> ");
    }

    // TODO: Customize parameter initialization
    @SuppressWarnings("unused")
    public static PostFragment newInstance(int columnCount) {
        Log.d("Post Fragment", "Inside Standalone Instance --> ");
        PostFragment fragment = new PostFragment();
        Bundle args = new Bundle();
        args.putInt(ARG_COLUMN_COUNT, columnCount);
        fragment.setArguments(args);
        return fragment;
    }

    @SuppressWarnings("unused")
    public static PostFragment newInstanceForProfile(int columnCount, int profile) {
        Log.d("Post Fragment", "Inside Profile Instance --> " + profile);
        PostFragment fragment = new PostFragment();
        Bundle args = new Bundle();
        args.putInt(ARG_COLUMN_COUNT, columnCount);
        args.putInt(PROFILE_ID, profile);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            mColumnCount = getArguments().getInt(ARG_COLUMN_COUNT);
            profileID = getArguments().getInt(PROFILE_ID);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_post_list, container, false);

        // Set the adapter
        if (view instanceof RecyclerView) {
            Context context = view.getContext();
            recyclerView = (RecyclerView) view;
            if (mColumnCount <= 1) {
                recyclerView.setLayoutManager(new LinearLayoutManager(context));
            } else {
                recyclerView.setLayoutManager(new GridLayoutManager(context, mColumnCount));
            }
            mAdapter = new MyPostRecyclerViewAdapter(getPersonalTimeline(getContext()), mListener);
            recyclerView.setAdapter(mAdapter);
        }
        return view;
    }

    private List<Post> getPersonalTimeline(Context context) {
        final List<Post> personalTimeline = new ArrayList<Post>();
        HashMap<String, String> params = new HashMap<String, String>();
        params.put("unique_id", PreferenceHandler.getAccessKey());
        if(profileID != 0) {
            params.put("profile", String.valueOf(profileID));
        }
        RequestHandler.HTTPRequest(context, ProjectProperties.METHOD_FETCH_TIMELINE, params, new ResponseHandler() {
            @Override
            public void handleSuccess(JSONObject response) throws Exception {
                if(response.getInt("status_code") == 200) {
                    JSONArray posts = response.getJSONArray("message");
                    for(int i  = 0; i < posts.length(); i++) {
                        JSONObject currentObj = posts.getJSONObject(i);
                        personalTimeline.add(new Post(currentObj.getInt("post_id"), currentObj.getString("photo"), currentObj.getString("post"), new Profile(currentObj.getInt("profile"), currentObj.getString("profile_pic"), currentObj.getString("screen_name")), currentObj.getString("timestamp")));
                    }
                    mAdapter.notifyDataSetChanged();
                } else {
                    Toast.makeText(getContext(), "Internal Error. Please try again later.", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void handleError(Exception e) throws Exception {
                e.printStackTrace();
            }
        });
        return personalTimeline;
    }


    @Override
    public void onAttach(Context context) {
        super.onAttach(context);
        if (context instanceof OnListFragmentInteractionListener) {
            mListener = (OnListFragmentInteractionListener) context;
        } else {
            throw new RuntimeException(context.toString()
                    + " must implement OnListFragmentInteractionListener");
        }
    }

    @Override
    public void onDetach() {
        super.onDetach();
        mListener = null;
    }

    /**
     * This interface must be implemented by activities that contain this
     * fragment to allow an interaction in this fragment to be communicated
     * to the activity and potentially other fragments contained in that
     * activity.
     * <p/>
     * See the Android Training lesson <a href=
     * "http://developer.android.com/training/basics/fragments/communicating.html"
     * >Communicating with Other Fragments</a> for more information.
     */
    public interface OnListFragmentInteractionListener {
        void onListFragmentInteraction();

    }
}
